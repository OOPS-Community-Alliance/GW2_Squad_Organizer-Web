import { describe, expect, it } from 'vitest';
import { Build, Squad } from './model';
import { buildPostText, safeFileName } from './post';
import { mergeBundle } from './merge';

const builds: Build[] = [
  {
    id: 1,
    name: 'HFB',
    profession: 'Guardian',
    elite: 'Firebrand',
    role: 'Heal',
    link: 'https://sc.com/hfb',
    tags: [],
    updatedAt: '',
  },
  {
    id: 2,
    name: 'Reaper',
    profession: 'Necromancer',
    elite: 'Reaper',
    role: '',
    link: '',
    tags: [],
    updatedAt: '',
  },
];
const map = new Map(builds.map((b) => [b.id, b]));
const squad: Squad = { id: 's', name: 's', updatedAt: '', groups: [{ slots: [2, 1, 2] }] };
const texts = { intro: 'Builds:', outro: 'Reagiert!', countLabel: 'Anzahl', linkLabel: 'Squad' };

describe('buildPostText', () => {
  it('listet jeden Build einmal mit Anzahl, wie create_post()', () => {
    expect(buildPostText(squad, map, texts)).toBe(
      'Builds:\n\n[Reaper (Anzahl: 2)]\n[HFB : Heal (Anzahl: 1)](https://sc.com/hfb)\n\nReagiert!',
    );
  });

  it('hängt den Squad-Link an', () => {
    expect(
      buildPostText(squad, map, texts, 'https://x/#s=1').endsWith('Squad: https://x/#s=1'),
    ).toBe(true);
  });

  it('bereinigt Dateinamen', () => {
    expect(safeFileName('Raid/Montag: 20 Uhr', 'x')).toBe('RaidMontag 20 Uhr');
    expect(safeFileName('???', 'fallback')).toBe('fallback');
  });
});

describe('mergeBundle', () => {
  it('verwendet gleiche Builds wieder und vergibt neue IDs', () => {
    const incoming = {
      name: 'Import',
      builds: [
        { ...builds[0], id: 1 },
        { ...builds[1], id: 2, name: 'Neu' },
      ],
      groups: [{ slots: [2, 1, null] }],
    };
    const result = mergeBundle(builds, incoming);
    expect(result.added).toBe(1);
    expect(result.reused).toBe(1);
    expect(result.builds.map((b) => [b.id, b.name])).toEqual([
      [1, 'HFB'],
      [2, 'Reaper'],
      [3, 'Neu'],
    ]);
    expect(result.groups[0].slots).toEqual([3, 1, null]);
  });
});
