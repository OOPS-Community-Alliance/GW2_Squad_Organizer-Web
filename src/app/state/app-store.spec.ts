import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppData } from '../domain/model';
import { AppStore } from './app-store';
import { LoadResult, Persistence } from './persistence';

class MemoryPersistence {
  saved: AppData | null = null;
  async load(): Promise<LoadResult> {
    return { data: this.saved, corrupt: false };
  }
  async save(data: AppData) {
    this.saved = data;
  }
  async requestPersistence() {}
}

describe('AppStore', () => {
  let store: AppStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: Persistence, useClass: MemoryPersistence }],
    });
    store = TestBed.inject(AppStore);
    await store.init();
  });

  it('startet mit den drei Standard-Builds und einem leeren Squad', () => {
    expect(store.builds().map((b) => b.elite)).toEqual(['Heal', 'pDPS', 'Stab']);
    expect(store.activeSquad().groups).toHaveLength(1);
    expect(store.canUndo()).toBe(false);
  });

  it('macht Änderungen rückgängig und wiederholt sie', () => {
    store.place({ group: 0, slot: 0 }, 1);
    store.addGroup();
    expect(store.activeSquad().groups).toHaveLength(2);

    store.undo();
    expect(store.activeSquad().groups).toHaveLength(1);
    expect(store.activeSquad().groups[0].slots[0]).toBe(1);

    store.undo();
    expect(store.activeSquad().groups[0].slots[0]).toBeNull();
    expect(store.canUndo()).toBe(false);

    store.redo();
    store.redo();
    expect(store.activeSquad().groups).toHaveLength(2);
    expect(store.canRedo()).toBe(false);
  });

  it('löscht Builds auch aus allen Squads', () => {
    store.place({ group: 0, slot: 0 }, 2);
    const first = store.activeSquad().id;
    store.createSquad('Zweiter');
    store.place({ group: 0, slot: 3 }, 2);
    expect(store.usageEverywhere(2)).toBe(2);

    store.deleteBuild(2);
    expect(store.buildMap().has(2)).toBe(false);
    expect(store.squads().every((s) => s.groups.every((g) => !g.slots.includes(2)))).toBe(true);
    store.setActive(first);
    expect(store.activeSquad().groups[0].slots[0]).toBeNull();
  });

  it('übernimmt Importe als neuen Squad und verwendet vorhandene Builds wieder', () => {
    const existing = store.builds()[0];
    const result = store.importBundle(
      {
        name: 'Import',
        builds: [
          { ...existing, id: 77 },
          { ...existing, id: 78, name: 'Neu', role: 'Support' },
        ],
        groups: [{ slots: [77, 78] }],
      },
      'Fallback',
    );
    expect(result).toMatchObject({ added: 1, reused: 1 });
    expect(store.activeSquad().name).toBe('Import');
    expect(store.activeSquad().groups[0].slots).toEqual([existing.id, 4]);
  });

  it('bereinigt Eingaben beim Anlegen', () => {
    const build = store.createBuild({
      name: '  HFB  ',
      profession: 'Guardian',
      elite: 'Firebrand',
      role: ' Heal ',
      link: 'javascript:alert(1)',
      tags: ['heal', 'heal'],
    });
    expect(build).toMatchObject({ id: 4, name: 'HFB', role: 'Heal', link: '', tags: ['heal'] });
  });

  it('löscht den letzten Squad nicht ersatzlos', () => {
    store.deleteSquad(store.activeSquad().id);
    expect(store.squads()).toHaveLength(1);
    expect(store.activeSquad().groups).toHaveLength(1);
  });
});
