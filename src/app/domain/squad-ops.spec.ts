import { describe, expect, it } from 'vitest';
import { Build, LIMITS, Squad } from './model';
import * as ops from './squad-ops';

const squad = (groups: (number | null)[][]): Squad => ({
  id: 's',
  name: 'Test',
  groups: groups.map((slots) => ({ slots })),
  updatedAt: '',
});

const build = (id: number, name = `B${id}`): Build => ({
  id,
  name,
  profession: 'Guardian',
  elite: 'Firebrand',
  role: '',
  link: '',
  tags: [],
  updatedAt: '',
});

describe('squad-ops', () => {
  it('erstellt einen Squad mit einer Gruppe und fünf leeren Slots', () => {
    const created = ops.createSquad('id', 'Neu', 'now');
    expect(created.groups).toEqual([{ slots: [null, null, null, null, null] }]);
  });

  it('begrenzt Gruppen auf 15 und Slots auf 10', () => {
    let s = squad([[null]]);
    for (let i = 0; i < 20; i++) s = ops.addGroup(s);
    expect(s.groups.length).toBe(LIMITS.maxGroups);
    for (let i = 0; i < 20; i++) s = ops.addSlot(s, 0);
    expect(s.groups[0].slots.length).toBe(LIMITS.maxSlots);
  });

  it('lässt mindestens eine Gruppe und einen Slot stehen', () => {
    const s = squad([[1]]);
    expect(ops.removeGroup(s, 0)).toBe(s);
    expect(ops.removeLastSlot(s, 0)).toBe(s);
  });

  it('verändert das Original nie', () => {
    const s = squad([[null, null]]);
    const placed = ops.placeBuild(s, { group: 0, slot: 1 }, 7);
    expect(s.groups[0].slots).toEqual([null, null]);
    expect(placed.groups[0].slots).toEqual([null, 7]);
  });

  it('tauscht beim Verschieben auf einen belegten Slot', () => {
    const s = squad([[1, 2], [3]]);
    const moved = ops.moveSlot(s, { group: 0, slot: 0 }, { group: 1, slot: 0 });
    expect(moved.groups.map((g) => g.slots)).toEqual([[3, 2], [1]]);
  });

  it('verschiebt auf einen leeren Slot', () => {
    const s = squad([[1, null]]);
    expect(ops.moveSlot(s, { group: 0, slot: 0 }, { group: 0, slot: 1 }).groups[0].slots).toEqual([
      null,
      1,
    ]);
  });

  it('ignoriert ungültige Positionen', () => {
    const s = squad([[1]]);
    expect(ops.placeBuild(s, { group: 3, slot: 0 }, 2)).toBe(s);
    expect(ops.moveSlot(s, { group: 0, slot: 0 }, { group: 0, slot: 5 })).toBe(s);
  });

  it('entfernt einen gelöschten Build aus allen Slots', () => {
    const s = squad([
      [1, 2],
      [1, null],
    ]);
    expect(ops.removeBuildEverywhere(s, 1).groups.map((g) => g.slots)).toEqual([
      [null, 2],
      [null, null],
    ]);
  });

  it('setzt den Squad wie clear_squad() zurück', () => {
    expect(ops.resetSquad(squad([[1, 2], [3]])).groups).toEqual([
      { slots: [null, null, null, null, null] },
    ]);
  });

  it('findet den ersten freien Slot gruppenübergreifend', () => {
    expect(
      ops.firstEmptySlot(
        squad([
          [1, 2],
          [3, null],
        ]),
      ),
    ).toEqual({ group: 1, slot: 1 });
    expect(ops.firstEmptySlot(squad([[1]]))).toBeNull();
  });

  it('zählt Builds in Reihenfolge des ersten Auftretens', () => {
    const map = new Map([1, 2].map((id) => [id, build(id)]));
    const result = ops.buildsInSquad(
      squad([
        [2, 1],
        [2, null],
      ]),
      map,
    );
    expect(result.map((r) => [r.build.id, r.count])).toEqual([
      [2, 2],
      [1, 1],
    ]);
    expect(
      ops.occupiedCount(
        squad([
          [2, 1],
          [2, null],
        ]),
      ),
    ).toBe(3);
  });
});
