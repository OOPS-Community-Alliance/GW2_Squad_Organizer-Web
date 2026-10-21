import { describe, expect, it } from 'vitest';
import { ImportError } from './bundle';
import { parseLegacyFile, toLegacyFile } from './legacy-format';
import { Squad } from './model';

const NOW = '2026-10-21T10:00:00.000Z';

/** So schreibt die Desktop-App (squadtool.py, export_data) ihre Datei. */
const DESKTOP_EXPORT = `{
  "builds": [
    {
      "id": 1,
      "name": "HFB",
      "klasse": "Guardian",
      "elite": "Firebrand",
      "rolle": "Heal",
      "link": "https://snowcrows.com/builds/wvw/guardian/heal-firebrand",
      "icon": "class_icon/Firebrand_tango_icon_48px.png",
      "zeit": "2026-10-18 21:15"
    },
    {
      "id": 5,
      "name": "StripSPB",
      "klasse": "Warrior",
      "elite": "Spellbreaker",
      "rolle": "Boonstrip",
      "link": "javascript:alert(1)",
      "icon": "class_icon/Spellbreaker_tango_icon_48px.png",
      "zeit": "2026-10-18 21:20"
    }
  ],
  "squad": [
    { "build_id": 1, "group": 0, "slot": 0 },
    { "build_id": 5, "group": 0, "slot": 1 },
    { "build_id": null, "group": 0, "slot": 2 },
    { "build_id": 1, "group": 1, "slot": 0 }
  ],
  "group_slots": { "0": 5, "1": 3 }
}`;

describe('legacy-format', () => {
  it('liest den Export der Desktop-App', () => {
    const bundle = parseLegacyFile(DESKTOP_EXPORT, 'Datei', NOW);
    expect(bundle.name).toBe('Datei');
    expect(bundle.groups.map((g) => g.slots)).toEqual([
      [1, 5, null, null, null],
      [1, null, null],
    ]);
    expect(bundle.builds[0]).toMatchObject({
      id: 1,
      name: 'HFB',
      profession: 'Guardian',
      elite: 'Firebrand',
      role: 'Heal',
      tags: ['heal'],
    });
    expect(new Date(bundle.builds[0].updatedAt).getDate()).toBe(18);
  });

  it('verwirft Links ohne http(s)', () => {
    const bundle = parseLegacyFile(DESKTOP_EXPORT, 'Datei', NOW);
    expect(bundle.builds[1].link).toBe('');
    expect(bundle.builds[1].tags).toEqual(['strip']);
  });

  it('schreibt ein Format, das die Desktop-App wieder lesen kann', () => {
    const squad: Squad = { id: 'x', name: 'Raid', updatedAt: NOW, groups: [{ slots: [1, null] }] };
    const bundle = parseLegacyFile(DESKTOP_EXPORT, 'Datei', NOW);
    const file = toLegacyFile(squad, bundle.builds);

    expect(file.group_slots).toEqual({ '0': 2 });
    expect(file.squad).toEqual([
      { build_id: 1, group: 0, slot: 0 },
      { build_id: null, group: 0, slot: 1 },
    ]);
    expect(file.builds[0]).toMatchObject({
      klasse: 'Guardian',
      elite: 'Firebrand',
      rolle: 'Heal',
      icon: 'class_icon/Firebrand_tango_icon_48px.png',
      zeit: '2026-10-18 21:15',
    });

    // Und zurück: Rundreise ohne Verlust.
    const again = parseLegacyFile(JSON.stringify(file), 'egal', NOW);
    expect(again.name).toBe('Raid');
    expect(again.groups).toEqual(squad.groups);
    expect(again.builds).toEqual(bundle.builds);
  });

  it.each([
    ['kein JSON', '{', 'notJson'],
    ['falsche Struktur', '{"builds": {}}', 'structure'],
    [
      'doppelte ID',
      '{"builds":[{"id":1,"name":"a","klasse":"Thief","elite":"Core"},{"id":1,"name":"b","klasse":"Thief","elite":"Core"}],"squad":[],"group_slots":{"0":1}}',
      'duplicateBuildId',
    ],
    ['zu viele Slots', '{"builds":[],"squad":[],"group_slots":{"0":11}}', 'slotCount'],
    ['keine Gruppe', '{"builds":[],"squad":[],"group_slots":{}}', 'groupCount'],
    [
      'fehlender Build',
      '{"builds":[],"squad":[{"build_id":3,"group":0,"slot":0}],"group_slots":{"0":1}}',
      'missingBuild',
    ],
    [
      'Slot außerhalb',
      '{"builds":[],"squad":[{"build_id":null,"group":0,"slot":4}],"group_slots":{"0":1}}',
      'entrySlot',
    ],
    [
      'doppelt belegt',
      '{"builds":[],"squad":[{"build_id":null,"group":0,"slot":0},{"build_id":null,"group":0,"slot":0}],"group_slots":{"0":1}}',
      'slotTwice',
    ],
  ])('meldet Fehler: %s', (_, json, code) => {
    expect(() => parseLegacyFile(json, 'x', NOW)).toThrowError(ImportError);
    try {
      parseLegacyFile(json, 'x', NOW);
    } catch (error) {
      expect((error as ImportError).code).toBe(code);
    }
  });

  it('ordnet unbekannte Klassen „Allgemein“ zu', () => {
    const json =
      '{"builds":[{"id":1,"name":"Neu","klasse":"Bard","elite":"Song"}],"squad":[],"group_slots":{"0":1}}';
    expect(parseLegacyFile(json, 'x', NOW).builds[0]).toMatchObject({
      profession: 'Allgemein',
      elite: 'Core',
    });
  });
});
