import { Injectable } from '@angular/core';
import { createStore, get, set, UseStore } from 'idb-keyval';
import { AppData } from '../domain/model';
import { isProfession, isRoleTag } from '../domain/professions';

const DATA_KEY = 'data';

export interface LoadResult {
  data: AppData | null;
  /** true, wenn gespeicherte Daten unlesbar waren und gesichert wurden. */
  corrupt: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Strukturprüfung der gespeicherten Daten, damit defekte Stände die App nicht lahmlegen. */
export function isAppData(value: unknown): value is AppData {
  if (!isObject(value) || value['version'] !== 1) return false;
  const { builds, squads, activeSquadId } = value;
  if (!Array.isArray(builds) || !Array.isArray(squads) || typeof activeSquadId !== 'string')
    return false;
  if (squads.length === 0) return false;

  const ids = new Set<number>();
  for (const build of builds) {
    if (
      !isObject(build) ||
      !Number.isInteger(build['id']) ||
      typeof build['name'] !== 'string' ||
      !isProfession(build['profession']) ||
      typeof build['elite'] !== 'string' ||
      typeof build['role'] !== 'string' ||
      typeof build['link'] !== 'string' ||
      typeof build['updatedAt'] !== 'string' ||
      !Array.isArray(build['tags']) ||
      !build['tags'].every(isRoleTag)
    ) {
      return false;
    }
    ids.add(build['id'] as number);
  }

  return squads.every(
    (squad) =>
      isObject(squad) &&
      typeof squad['id'] === 'string' &&
      typeof squad['name'] === 'string' &&
      typeof squad['updatedAt'] === 'string' &&
      Array.isArray(squad['groups']) &&
      squad['groups'].length > 0 &&
      squad['groups'].every(
        (group) =>
          isObject(group) &&
          Array.isArray(group['slots']) &&
          group['slots'].length > 0 &&
          group['slots'].every((slot) => slot === null || ids.has(slot as number)),
      ),
  );
}

/** Speichert den App-Stand in IndexedDB. Als Klasse, damit Tests sie ersetzen können. */
@Injectable({ providedIn: 'root' })
export class Persistence {
  private store: UseStore | null = null;

  private db(): UseStore {
    this.store ??= createStore('gw2-squad-organizer', 'state');
    return this.store;
  }

  async load(): Promise<LoadResult> {
    try {
      const raw = await get(DATA_KEY, this.db());
      if (raw === undefined) return { data: null, corrupt: false };
      if (isAppData(raw)) return { data: raw, corrupt: false };
      await set(`corrupt-${Date.now()}`, raw, this.db());
      return { data: null, corrupt: true };
    } catch {
      // Kein IndexedDB (z. B. manche private Modi): Die App läuft dann nur im Speicher.
      return { data: null, corrupt: false };
    }
  }

  async save(data: AppData): Promise<void> {
    await set(DATA_KEY, data, this.db());
  }

  /** Bittet den Browser, die Daten nicht automatisch zu löschen. */
  async requestPersistence(): Promise<void> {
    try {
      if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
        await navigator.storage.persist();
      }
    } catch {
      // Nicht unterstützt: kein Problem, nur weniger Schutz vor Aufräumen.
    }
  }
}
