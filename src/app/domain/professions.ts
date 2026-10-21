/** Klassen und Elite-Spezialisierungen, übernommen aus squadtool.py (SPECIALIZATIONS). */
export const PROFESSIONS = [
  'Elementalist',
  'Mesmer',
  'Necromancer',
  'Engineer',
  'Ranger',
  'Thief',
  'Guardian',
  'Warrior',
  'Revenant',
  'Allgemein',
] as const;

export type Profession = (typeof PROFESSIONS)[number];

/** „Allgemein“ ist kein GW2-Beruf, sondern die Sammelklasse für Rollen-Platzhalter. */
export const GENERIC_PROFESSION: Profession = 'Allgemein';

export const SPECIALIZATIONS: Record<Profession, readonly string[]> = {
  Elementalist: ['Core', 'Tempest', 'Weaver', 'Catalyst', 'Evoker'],
  Mesmer: ['Core', 'Chronomancer', 'Mirage', 'Virtuoso', 'Troubadour'],
  Necromancer: ['Core', 'Reaper', 'Scourge', 'Harbinger', 'Ritualist'],
  Engineer: ['Core', 'Scrapper', 'Holosmith', 'Mechanist', 'Amalgam'],
  Ranger: ['Core', 'Druid', 'Soulbeast', 'Untamed', 'Galeshot'],
  Thief: ['Core', 'Daredevil', 'Deadeye', 'Specter', 'Antiquary'],
  Guardian: ['Core', 'Dragonhunter', 'Firebrand', 'Willbender', 'Luminary'],
  Warrior: ['Core', 'Berserker', 'Spellbreaker', 'Bladesworn', 'Paragon'],
  Revenant: ['Core', 'Herald', 'Renegade', 'Vindicator', 'Conduit'],
  Allgemein: [
    'Core',
    'Quick',
    'Alacrity',
    'Heal',
    'Tank',
    'Toolkit',
    'Block',
    'pDPS',
    'cDPS',
    'Invul',
    'Stab',
    'Portal',
  ],
};

export function isProfession(value: unknown): value is Profession {
  return typeof value === 'string' && (PROFESSIONS as readonly string[]).includes(value);
}

/** Aufgaben, die ein Build im Squad übernimmt. Grundlage für die Rollen-Übersicht. */
export const ROLE_TAGS = [
  'heal',
  'stab',
  'quickness',
  'alacrity',
  'strip',
  'cleanse',
  'pdps',
  'cdps',
  'tank',
  'block',
  'invul',
  'portal',
  'stealth',
  'toolkit',
] as const;

export type RoleTag = (typeof ROLE_TAGS)[number];

export function isRoleTag(value: unknown): value is RoleTag {
  return typeof value === 'string' && (ROLE_TAGS as readonly string[]).includes(value);
}

export const DEFAULT_REQUIRED_TAGS: readonly RoleTag[] = ['heal', 'stab'];

/** Vereinheitlicht Namen für Vergleiche (wie normalize() im Python-Original). */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ICON_STEMS = [
  'Amalgam',
  'Antiquary',
  'Berserker',
  'Bladesworn',
  'Catalyst',
  'Chronomancer',
  'Conduit',
  'Daredevil',
  'Deadeye',
  'Dragonhunter',
  'Druid',
  'Elementalist',
  'Engineer',
  'Evoker',
  'Firebrand',
  'Galeshot',
  'Guardian',
  'Harbinger',
  'Herald',
  'Holosmith',
  'Luminary',
  'Mechanist',
  'Mesmer',
  'Mirage',
  'Necromancer',
  'Paragon',
  'Ranger',
  'Reaper',
  'Renegade',
  'Revenant',
  'Ritualist',
  'Scourge',
  'Scrapper',
  'Soulbeast',
  'Specter',
  'Spellbreaker',
  'Tempest',
  'Thief',
  'Troubadour',
  'Untamed',
  'Vindicator',
  'Virtuoso',
  'Warrior',
  'Weaver',
  'Willbender',
  'alacrity',
  'allgemein',
  'block',
  'cdps',
  'heal',
  'invul',
  'pdps',
  'portal',
  'quick',
  'quickness',
  'stab',
  'stealth',
  'tank',
  'toolkit',
] as const;

const ICON_BY_KEY = new Map<string, string>(ICON_STEMS.map((stem) => [normalize(stem), stem]));

function iconStem(profession: string, elite: string): string | null {
  // Wie find_icon(): Bei „Core“ steht das Klassen-Icon für den Build.
  const name = elite === 'Core' ? profession : elite;
  return ICON_BY_KEY.get(normalize(name)) ?? null;
}

/** Relativer Pfad zum Klassen-Icon, passend zum base href der App. */
export function iconUrl(profession: string, elite: string): string | null {
  const stem = iconStem(profession, elite);
  return stem ? `icons/classes/${stem}_tango_icon_48px.png` : null;
}

export function tagIconUrl(tag: RoleTag): string | null {
  const stem = ICON_BY_KEY.get(tag);
  return stem ? `icons/classes/${stem}_tango_icon_48px.png` : null;
}

/** Icon-Pfad im Format der Desktop-App, damit deren Import das Icon findet. */
export function legacyIconPath(profession: string, elite: string): string {
  const stem = iconStem(profession, elite);
  return stem ? `class_icon/${stem}_tango_icon_48px.png` : '';
}
