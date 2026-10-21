import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { SquadBundle } from '../domain/bundle';
import { mergeBundle, nextBuildId } from '../domain/merge';
import { AppData, Build, BuildInput, LIMITS, sanitizeLink, SlotRef, Squad } from '../domain/model';
import { GENERIC_PROFESSION } from '../domain/professions';
import { inferTags } from '../domain/role-tags';
import * as ops from '../domain/squad-ops';
import { I18n } from '../i18n/i18n';
import { Persistence } from './persistence';

const HISTORY_LIMIT = 100;
const SAVE_DELAY_MS = 300;
const CHANNEL = 'gw2-squad-organizer';

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

function seedData(squadName: string): AppData {
  // Wie add_default_builds(): drei allgemeine Platzhalter für den Start.
  const time = now();
  const builds: Build[] = ['Heal', 'pDPS', 'Stab'].map((elite, index) => {
    const base = {
      name: `Allgemein - ${elite}`,
      profession: GENERIC_PROFESSION,
      elite,
      role: elite,
    };
    return { ...base, id: index + 1, link: '', tags: inferTags(base), updatedAt: time };
  });
  const squad = ops.createSquad(newId(), squadName, time);
  return { version: 1, builds, squads: [squad], activeSquadId: squad.id };
}

function cleanInput(input: BuildInput): BuildInput {
  return {
    ...input,
    name: input.name.trim().slice(0, LIMITS.nameMaxLength),
    role: input.role.trim().slice(0, LIMITS.roleMaxLength),
    link: sanitizeLink(input.link),
    tags: [...new Set(input.tags)],
  };
}

/**
 * Zentraler Zustand: Build-Bibliothek und Squads. Jede Änderung erzeugt einen neuen,
 * unveränderlichen Stand. Das ergibt Undo/Redo und automatisches Speichern.
 */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly persistence = inject(Persistence);
  private readonly i18n = inject(I18n);

  private readonly state = signal<AppData>(seedData(this.i18n.t().squads.defaultName));
  private readonly past = signal<AppData[]>([]);
  private readonly future = signal<AppData[]>([]);

  private loaded = false;
  private saveTimer?: ReturnType<typeof setTimeout>;
  /** Stand, der gerade aus einem anderen Tab kam und nicht zurückgeschrieben werden soll. */
  private externalState: AppData | null = null;
  private channel: BroadcastChannel | null = null;

  /** Meldungen an die Oberfläche (Speicherfehler, Sync aus anderem Tab). */
  readonly notice = signal<{ kind: 'corrupt' | 'saveFailed' | 'synced'; at: number } | null>(null);

  readonly data = this.state.asReadonly();
  readonly builds = computed(() => this.state().builds);
  readonly squads = computed(() => this.state().squads);
  readonly buildMap = computed(() => new Map(this.builds().map((build) => [build.id, build])));
  readonly activeSquad = computed(() => {
    const data = this.state();
    return data.squads.find((squad) => squad.id === data.activeSquadId) ?? data.squads[0];
  });
  readonly usage = computed(() => ops.usageCounts(this.activeSquad()));
  readonly canUndo = computed(() => this.past().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);

  constructor() {
    effect(() => {
      const data = this.state();
      untracked(() => this.scheduleSave(data));
    });
  }

  /** Lädt den gespeicherten Stand. Läuft vor dem ersten Rendern (provideAppInitializer). */
  async init(): Promise<void> {
    const { data, corrupt } = await this.persistence.load();
    if (data) this.state.set(data);
    if (corrupt) this.notice.set({ kind: 'corrupt', at: Date.now() });
    this.loaded = true;
    this.listenToOtherTabs();
  }

  // ---------- Verlauf ----------

  private commit(next: AppData): boolean {
    const previous = this.state();
    if (next === previous) return false;
    this.past.update((list) => [...list.slice(-(HISTORY_LIMIT - 1)), previous]);
    this.future.set([]);
    this.state.set(next);
    return true;
  }

  undo(): boolean {
    const past = this.past();
    if (!past.length) return false;
    this.future.update((list) => [this.state(), ...list]);
    this.past.set(past.slice(0, -1));
    this.state.set(past[past.length - 1]);
    return true;
  }

  redo(): boolean {
    const [next, ...rest] = this.future();
    if (!next) return false;
    this.past.update((list) => [...list, this.state()]);
    this.future.set(rest);
    this.state.set(next);
    return true;
  }

  private updateActive(update: (squad: Squad) => Squad): boolean {
    const data = this.state();
    const active = this.activeSquad();
    const next = update(active);
    if (next === active) return false;
    const stamped = { ...next, updatedAt: now() };
    return this.commit({
      ...data,
      squads: data.squads.map((squad) => (squad.id === active.id ? stamped : squad)),
    });
  }

  // ---------- Squad-Aufbau ----------

  addGroup = () => this.updateActive(ops.addGroup);
  removeGroup = (index: number) => this.updateActive((s) => ops.removeGroup(s, index));
  clearGroup = (index: number) => this.updateActive((s) => ops.clearGroup(s, index));
  addSlot = (index: number) => this.updateActive((s) => ops.addSlot(s, index));
  removeLastSlot = (index: number) => this.updateActive((s) => ops.removeLastSlot(s, index));
  place = (ref: SlotRef, buildId: number) =>
    this.updateActive((s) => ops.placeBuild(s, ref, buildId));
  clearSlot = (ref: SlotRef) => this.updateActive((s) => ops.clearSlot(s, ref));
  move = (from: SlotRef, to: SlotRef) => this.updateActive((s) => ops.moveSlot(s, from, to));
  resetSquad = () => this.updateActive(ops.resetSquad);

  // ---------- Build-Bibliothek ----------

  createBuild(input: BuildInput): Build {
    const data = this.state();
    const build: Build = { ...cleanInput(input), id: nextBuildId(data.builds), updatedAt: now() };
    this.commit({ ...data, builds: [...data.builds, build] });
    return build;
  }

  updateBuild(id: number, input: BuildInput): void {
    const data = this.state();
    this.commit({
      ...data,
      builds: data.builds.map((build) =>
        build.id === id ? { ...build, ...cleanInput(input), updatedAt: now() } : build,
      ),
    });
  }

  /** Löscht den Build und entfernt ihn aus allen Squads (delete_build()). */
  deleteBuild(id: number): void {
    const data = this.state();
    this.commit({
      ...data,
      builds: data.builds.filter((build) => build.id !== id),
      squads: data.squads.map((squad) => ops.removeBuildEverywhere(squad, id)),
    });
  }

  /** Anzahl der Slots in allen Squads, die diesen Build verwenden. */
  usageEverywhere(id: number): number {
    return this.squads().reduce((sum, squad) => sum + (ops.usageCounts(squad).get(id) ?? 0), 0);
  }

  // ---------- Squads verwalten ----------

  setActive(id: string): void {
    const data = this.state();
    if (data.activeSquadId === id || !data.squads.some((squad) => squad.id === id)) return;
    // Bewusst ohne Verlaufseintrag: Squad-Wechsel ist Navigation, keine Änderung.
    this.state.set({ ...data, activeSquadId: id });
  }

  createSquad(name: string): Squad {
    const data = this.state();
    const squad = ops.createSquad(newId(), name.trim() || this.i18n.t().squads.defaultName, now());
    this.commit({ ...data, squads: [...data.squads, squad], activeSquadId: squad.id });
    return squad;
  }

  duplicateActive(): Squad {
    const data = this.state();
    const source = this.activeSquad();
    const copy: Squad = {
      ...source,
      id: newId(),
      name: this.i18n.t().squads.copyName(source.name).slice(0, LIMITS.nameMaxLength),
      updatedAt: now(),
    };
    const index = data.squads.indexOf(source);
    const squads = [...data.squads];
    squads.splice(index + 1, 0, copy);
    this.commit({ ...data, squads, activeSquadId: copy.id });
    return copy;
  }

  renameActive(name: string): void {
    const clean = name.trim().slice(0, LIMITS.nameMaxLength);
    if (!clean) return;
    this.updateActive((squad) => (squad.name === clean ? squad : { ...squad, name: clean }));
  }

  deleteSquad(id: string): void {
    const data = this.state();
    const index = data.squads.findIndex((squad) => squad.id === id);
    if (index === -1) return;
    let squads = data.squads.filter((squad) => squad.id !== id);
    if (!squads.length)
      squads = [ops.createSquad(newId(), this.i18n.t().squads.defaultName, now())];
    const activeSquadId =
      data.activeSquadId === id
        ? squads[Math.min(index, squads.length - 1)].id
        : data.activeSquadId;
    this.commit({ ...data, squads, activeSquadId });
  }

  /** Übernimmt einen importierten oder geteilten Squad als neuen Squad. */
  importBundle(
    bundle: SquadBundle,
    fallbackName: string,
  ): { squad: Squad; added: number; reused: number } {
    const data = this.state();
    const merged = mergeBundle(data.builds, bundle);
    const squad: Squad = {
      id: newId(),
      name: (bundle.name || fallbackName).slice(0, LIMITS.nameMaxLength),
      groups: merged.groups,
      updatedAt: now(),
    };
    this.commit({
      ...data,
      builds: merged.builds,
      squads: [...data.squads, squad],
      activeSquadId: squad.id,
    });
    return { squad, added: merged.added, reused: merged.reused };
  }

  // ---------- Speichern ----------

  private scheduleSave(data: AppData): void {
    if (!this.loaded) return;
    if (data === this.externalState) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.save(data), SAVE_DELAY_MS);
  }

  private async save(data: AppData): Promise<void> {
    try {
      await this.persistence.save(data);
      this.channel?.postMessage({ type: 'saved' });
      void this.persistence.requestPersistence();
    } catch {
      this.notice.set({ kind: 'saveFailed', at: Date.now() });
    }
  }

  private listenToOtherTabs(): void {
    if (typeof BroadcastChannel === 'undefined') return;
    this.channel = new BroadcastChannel(CHANNEL);
    this.channel.onmessage = async (event) => {
      if (event.data?.type !== 'saved') return;
      const { data } = await this.persistence.load();
      if (!data) return;
      this.externalState = data;
      this.past.set([]);
      this.future.set([]);
      this.state.set(data);
      this.notice.set({ kind: 'synced', at: Date.now() });
    };
  }
}
