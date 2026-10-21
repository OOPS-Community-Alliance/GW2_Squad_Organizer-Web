import { describe, expect, it } from 'vitest';
import { ImportError } from './bundle';
import { Build, Squad } from './model';
import { decodeShare, encodeShare, readShareFragment, shareUrl } from './share-codec';

const NOW = '2026-10-21T10:00:00.000Z';

const builds: Build[] = [
  {
    id: 4,
    name: 'HFB',
    profession: 'Guardian',
    elite: 'Firebrand',
    role: 'Heal',
    link: 'https://snowcrows.com/x',
    tags: ['heal', 'stab'],
    updatedAt: NOW,
  },
  {
    id: 9,
    name: 'Scourge',
    profession: 'Necromancer',
    elite: 'Scourge',
    role: 'DPS',
    link: '',
    tags: ['cdps', 'strip'],
    updatedAt: NOW,
  },
  {
    id: 12,
    name: 'Unbenutzt',
    profession: 'Thief',
    elite: 'Core',
    role: '',
    link: '',
    tags: [],
    updatedAt: NOW,
  },
];
const map = new Map(builds.map((b) => [b.id, b]));
const squad: Squad = {
  id: 's',
  name: 'Raid Montag',
  updatedAt: NOW,
  groups: [{ slots: [4, 9, null, 4, null] }, { slots: [9] }],
};

describe('share-codec', () => {
  it('überträgt Squad und verwendete Builds verlustfrei', async () => {
    const decoded = await decodeShare(await encodeShare(squad, map), NOW);
    expect(decoded.name).toBe('Raid Montag');
    expect(decoded.builds.map((b) => b.name)).toEqual(['HFB', 'Scourge']);
    expect(decoded.builds[0]).toMatchObject({
      profession: 'Guardian',
      elite: 'Firebrand',
      link: 'https://snowcrows.com/x',
      tags: ['heal', 'stab'],
    });
    // Slot-IDs verweisen auf die Bundle-IDs (Position + 1).
    expect(decoded.groups.map((g) => g.slots)).toEqual([[1, 2, null, 1, null], [2]]);
  });

  it('erzeugt kurze, URL-sichere Codes', async () => {
    const code = await encodeShare(squad, map);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(300);
  });

  it('lehnt beschädigte Codes ab', async () => {
    await expect(decodeShare('kaputt!', NOW)).rejects.toBeInstanceOf(ImportError);
    await expect(decodeShare('AAAA', NOW)).rejects.toMatchObject({ code: 'shareInvalid' });
  });

  it('liest den Code aus dem Fragment', () => {
    const url = shareUrl('https://example.org/app/', 'abc_-1');
    expect(url).toBe('https://example.org/app/#s=abc_-1');
    expect(readShareFragment(new URL(url).hash)).toBe('abc_-1');
    expect(readShareFragment('')).toBeNull();
  });
});
