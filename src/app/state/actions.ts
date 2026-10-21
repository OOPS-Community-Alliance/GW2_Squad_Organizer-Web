import { inject, Injectable } from '@angular/core';
import { ImportError } from '../domain/bundle';
import { toLegacyFile, parseLegacyFile } from '../domain/legacy-format';
import { Build, SlotRef } from '../domain/model';
import { safeFileName } from '../domain/post';
import { firstEmptySlot, slotValue } from '../domain/squad-ops';
import { Dialogs } from '../dialogs/dialogs';
import { I18n } from '../i18n/i18n';
import { DISCORD_SAFE_LENGTH, Sharing } from '../post/sharing';
import { DragPayload, DropHandler } from '../ui/drag/drag-drop';
import { Feedback } from '../ui/feedback';
import { copyText, downloadBlob, pickFile } from '../ui/files';
import { AppStore } from './app-store';
import { Layout } from './layout';
import { sameRef, SelectionState } from './selection';

/**
 * Bedienlogik zwischen Oberfläche und Store: Auswahl-Modell, Bestätigungen,
 * Ansagen und „Rückgängig“-Hinweise. Komponenten rufen nur diese Methoden auf.
 */
@Injectable({ providedIn: 'root' })
export class Actions implements DropHandler {
  private readonly store = inject(AppStore);
  private readonly selection = inject(SelectionState);
  private readonly dialogs = inject(Dialogs);
  private readonly feedback = inject(Feedback);
  private readonly sharing = inject(Sharing);
  private readonly layout = inject(Layout);
  private readonly i18n = inject(I18n);

  private get t() {
    return this.i18n.t();
  }

  private buildAt(ref: SlotRef): Build | undefined {
    const id = slotValue(this.store.activeSquad(), ref);
    return id === null || id === undefined ? undefined : this.store.buildMap().get(id);
  }

  // ---------- Auswahl & Platzieren ----------

  /** Ein Slot wurde angetippt oder per Tastatur aktiviert. */
  async activateSlot(ref: SlotRef): Promise<void> {
    const selection = this.selection.current();

    if (selection?.kind === 'build') {
      this.place(selection.buildId, ref);
      return;
    }

    if (selection?.kind === 'slot') {
      if (sameRef(selection.ref, ref)) this.selection.clear();
      else {
        this.move(selection.ref, ref);
        this.selection.clear();
      }
      return;
    }

    if (this.buildAt(ref)) {
      this.selection.selectSlot(ref);
      return;
    }

    await this.pickInto(ref);
  }

  /** Öffnet die Build-Auswahl für einen Slot (leerer Slot oder „Ersetzen“). */
  async pickInto(ref: SlotRef): Promise<void> {
    const result = await this.dialogs.pickBuild(ref);
    if (result === undefined) return;
    if (result === 'create') {
      const build = await this.createBuild();
      if (build) this.place(build.id, ref);
      return;
    }
    this.place(result, ref);
  }

  activateBuild(buildId: number): void {
    if (this.selection.libraryBuildId() === buildId) this.selection.clear();
    else this.selection.selectBuild(buildId);
  }

  place(buildId: number, ref: SlotRef): void {
    const build = this.store.buildMap().get(buildId);
    const previous = this.buildAt(ref);
    if (!build || previous?.id === buildId) return;
    if (!this.store.place(ref, buildId)) return;
    const g = ref.group + 1;
    const s = ref.slot + 1;
    if (previous) this.feedback.undoable(this.t.slot.replaced(build.name, g, s));
    else this.feedback.announce(this.t.slot.placed(build.name, g, s));
  }

  placeInNextFree(buildId: number): void {
    const ref = firstEmptySlot(this.store.activeSquad());
    if (!ref) {
      this.feedback.toast(this.t.slot.noFreeSlot);
      return;
    }
    this.place(buildId, ref);
    const build = this.store.buildMap().get(buildId);
    if (build) this.feedback.toast(this.t.slot.placed(build.name, ref.group + 1, ref.slot + 1));
  }

  move(from: SlotRef, to: SlotRef): void {
    const build = this.buildAt(from);
    if (!build || !this.store.move(from, to)) return;
    this.feedback.announce(this.t.slot.moved(build.name, to.group + 1, to.slot + 1));
  }

  clearSlot(ref: SlotRef): void {
    const build = this.buildAt(ref);
    if (!build || !this.store.clearSlot(ref)) return;
    if (this.selection.slot() && sameRef(this.selection.slot()!, ref)) this.selection.clear();
    this.feedback.undoable(this.t.slot.cleared(build.name));
  }

  /** Auf schmalen Bildschirmen: aus der Bibliothek zum Platzieren in den Squad wechseln. */
  startPlacing(buildId: number): void {
    this.selection.selectBuild(buildId);
    this.layout.show('squad');
  }

  // ---------- Drag & Drop ----------

  drop(payload: DragPayload, target: SlotRef): void {
    if (payload.kind === 'build') this.place(payload.buildId, target);
    else this.move(payload.ref, target);
    this.selection.clear();
  }

  dropOutside(payload: DragPayload): void {
    if (payload.kind === 'slot') this.clearSlot(payload.ref);
  }

  // ---------- Gruppen ----------

  addGroup(): void {
    if (!this.store.addGroup()) this.feedback.toast(this.t.squad.maxGroups);
  }

  addSlot(group: number): void {
    if (!this.store.addSlot(group)) this.feedback.toast(this.t.group.maxSlots);
  }

  removeLastSlot(group: number): void {
    if (!this.store.removeLastSlot(group)) this.feedback.toast(this.t.group.minSlots);
  }

  clearGroup(group: number): void {
    if (this.store.clearGroup(group)) this.feedback.undoable(this.t.group.cleared(group + 1));
  }

  async removeGroup(group: number): Promise<void> {
    const squad = this.store.activeSquad();
    if (squad.groups.length <= 1) {
      this.feedback.toast(this.t.group.minGroups);
      return;
    }
    const occupied = squad.groups[group]?.slots.some((id) => id !== null);
    if (
      occupied &&
      !(await this.dialogs.confirm({
        title: this.t.group.removeTitle(group + 1),
        text: this.t.group.removeText,
        confirm: this.t.group.removeAction,
        destructive: true,
      }))
    ) {
      return;
    }
    this.selection.clear();
    if (this.store.removeGroup(group)) this.feedback.undoable(this.t.group.removed(group + 1));
  }

  async resetSquad(): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: this.t.squad.resetTitle,
      text: this.t.squad.resetText,
      confirm: this.t.squad.resetAction,
      destructive: true,
    });
    if (!confirmed) return;
    this.selection.clear();
    if (this.store.resetSquad()) this.feedback.undoable(this.t.squad.resetDone);
  }

  // ---------- Builds ----------

  async createBuild(): Promise<Build | null> {
    const input = await this.dialogs.buildForm();
    if (!input) return null;
    const build = this.store.createBuild(input);
    this.selection.selectBuild(build.id);
    this.feedback.toast(this.t.buildForm.created(build.name));
    return build;
  }

  async editBuild(id: number): Promise<void> {
    const build = this.store.buildMap().get(id);
    if (!build) return;
    const input = await this.dialogs.buildForm(build);
    if (!input) return;
    this.store.updateBuild(id, input);
    this.feedback.undoable(this.t.buildForm.updated(input.name));
  }

  async deleteBuild(id: number): Promise<void> {
    const build = this.store.buildMap().get(id);
    if (!build) return;
    const confirmed = await this.dialogs.confirm({
      title: this.t.deleteBuild.title,
      text: this.t.deleteBuild.text(build.name, this.store.usageEverywhere(id)),
      confirm: this.t.deleteBuild.action,
      destructive: true,
    });
    if (!confirmed) return;
    this.selection.clear();
    this.store.deleteBuild(id);
    this.feedback.undoable(this.t.deleteBuild.done(build.name));
  }

  // ---------- Squads ----------

  switchSquad(id: string): void {
    this.selection.clear();
    this.store.setActive(id);
    this.feedback.announce(this.t.squads.switched(this.store.activeSquad().name));
  }

  async newSquad(): Promise<void> {
    const t = this.t.squads;
    const name = await this.dialogs.askName({
      title: t.newTitle,
      label: t.nameLabel,
      hint: t.nameHint,
      action: t.createAction,
      value: '',
    });
    if (!name) return;
    this.selection.clear();
    const squad = this.store.createSquad(name);
    this.feedback.toast(t.created(squad.name));
  }

  duplicateSquad(): void {
    const squad = this.store.duplicateActive();
    this.feedback.undoable(this.t.squads.created(squad.name));
  }

  async renameSquad(): Promise<void> {
    const t = this.t.squads;
    const name = await this.dialogs.askName({
      title: t.renameTitle,
      label: t.nameLabel,
      hint: t.nameHint,
      action: t.renameAction,
      value: this.store.activeSquad().name,
    });
    if (name) this.store.renameActive(name);
  }

  async deleteSquad(): Promise<void> {
    const t = this.t.squads;
    const squad = this.store.activeSquad();
    const confirmed = await this.dialogs.confirm({
      title: t.removeTitle,
      text: t.removeText(squad.name),
      confirm: t.removeAction,
      destructive: true,
    });
    if (!confirmed) return;
    this.selection.clear();
    this.store.deleteSquad(squad.id);
    this.feedback.undoable(t.removed(squad.name));
  }

  // ---------- Verlauf ----------

  undo(): void {
    if (this.store.undo()) this.feedback.announce(this.t.common.undo);
  }

  redo(): void {
    if (this.store.redo()) this.feedback.announce(this.t.common.redo);
  }

  // ---------- Teilen, Export, Import ----------

  async copyShareLink(): Promise<void> {
    const link = await this.sharing.link();
    if (await copyText(link)) {
      this.feedback.toast(
        link.length > DISCORD_SAFE_LENGTH
          ? `${this.t.share.copied} ${this.t.share.long(link.length)}`
          : this.t.share.copied,
      );
    } else {
      this.feedback.persistent(`${this.t.share.copyFailed} ${link}`, this.t.common.close);
    }
  }

  openPost(): Promise<void> {
    return this.dialogs.post();
  }

  exportJson(): void {
    const squad = this.store.activeSquad();
    const file = `${safeFileName(squad.name, 'squad')}.json`;
    const json = JSON.stringify(toLegacyFile(squad, this.store.builds()), null, 2);
    downloadBlob(new Blob([json], { type: 'application/json' }), file);
    this.feedback.toast(this.t.io.exported(file));
  }

  async importJson(): Promise<void> {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    try {
      const fallback = file.name.replace(/\.json$/i, '') || this.t.io.importedName;
      const bundle = parseLegacyFile(await file.text(), fallback, new Date().toISOString());
      this.selection.clear();
      const result = this.store.importBundle(bundle, fallback);
      this.feedback.undoable(this.t.io.imported(result.squad.name, result.added, result.reused));
    } catch (error) {
      this.showImportError(error);
    }
  }

  /** Prüft beim Start, ob die Adresse einen geteilten Squad enthält. */
  async handleShareLink(): Promise<void> {
    let bundle;
    try {
      bundle = await this.sharing.readFromLocation();
    } catch (error) {
      this.sharing.clearLocation();
      this.showImportError(error);
      return;
    }
    if (!bundle) return;
    this.sharing.clearLocation();
    if (!(await this.dialogs.shareImport(bundle))) return;
    const result = this.store.importBundle(bundle, this.t.share.sharedName);
    this.layout.show('squad');
    this.feedback.undoable(this.t.io.imported(result.squad.name, result.added, result.reused));
  }

  private showImportError(error: unknown): void {
    const message =
      error instanceof ImportError
        ? this.t.io.importErrors[error.code](String(error.detail))
        : this.t.io.unknownError;
    this.feedback.persistent(`${this.t.io.importFailed}: ${message}`, this.t.common.close);
  }
}
