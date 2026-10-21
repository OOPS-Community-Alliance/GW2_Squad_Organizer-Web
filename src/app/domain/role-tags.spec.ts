import { describe, expect, it } from 'vitest';
import { Build, Squad } from './model';
import { inferTags, roleOverview } from './role-tags';
import { Profession } from './professions';

const b = (
  id: number,
  profession: Profession,
  elite: string,
  role: string,
  tags: Build['tags'],
): Build => ({
  id,
  name: `B${id}`,
  profession,
  elite,
  role,
  link: '',
  tags,
  updatedAt: '',
});

describe('inferTags', () => {
  it.each([
    [{ name: 'HFB', profession: 'Guardian', elite: 'Firebrand', role: 'Heal' }, ['heal']],
    [
      { name: 'StripSPB', profession: 'Warrior', elite: 'Spellbreaker', role: 'Boonstrip' },
      ['strip'],
    ],
    [{ name: 'Allgemein - Stab', profession: 'Allgemein', elite: 'Stab', role: 'Stab' }, ['stab']],
    [
      { name: 'Allgemein - Quick', profession: 'Allgemein', elite: 'Quick', role: '' },
      ['quickness'],
    ],
    [
      { name: 'SC - Power Reaper', profession: 'Necromancer', elite: 'Reaper', role: 'Power' },
      ['pdps'],
    ],
    [{ name: 'Scourge', profession: 'Necromancer', elite: 'Scourge', role: 'DPS' }, ['pdps']],
    [{ name: 'Condi Scourge', profession: 'Necromancer', elite: 'Scourge', role: 'DPS' }, ['cdps']],
  ] as const)('%o → %o', (input, expected) => {
    expect(inferTags(input)).toEqual(expected);
  });
});

describe('roleOverview', () => {
  const builds = [
    b(1, 'Guardian', 'Firebrand', 'Heal', ['heal', 'stab']),
    b(2, 'Necromancer', 'Reaper', 'DPS', ['pdps']),
  ];
  const map = new Map(builds.map((x) => [x.id, x]));
  const squad: Squad = {
    id: 's',
    name: 's',
    updatedAt: '',
    groups: [{ slots: [1, 2] }, { slots: [2, 2, null] }, { slots: [null] }],
  };

  it('markiert fehlende Pflicht-Aufgaben nur in belegten Gruppen', () => {
    const result = roleOverview(squad, map, ['heal', 'stab']);
    expect(result.groups.map((g) => g.missing)).toEqual([[], ['heal', 'stab'], []]);
    expect(result.totals).toEqual({ heal: 1, stab: 1, pdps: 3 });
    expect(result.occupied).toBe(4);
  });

  it('zählt Freitext-Rollen absteigend', () => {
    expect(roleOverview(squad, map, []).roles).toEqual([
      { role: 'DPS', count: 3 },
      { role: 'Heal', count: 1 },
    ]);
  });
});
