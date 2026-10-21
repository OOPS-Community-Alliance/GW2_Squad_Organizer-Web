import { Build, Squad } from './model';
import { GENERIC_PROFESSION, normalize, ROLE_TAGS, RoleTag } from './professions';

const GENERIC_ELITE_TAGS: Record<string, RoleTag> = {
  quick: 'quickness',
  alacrity: 'alacrity',
  heal: 'heal',
  tank: 'tank',
  toolkit: 'toolkit',
  block: 'block',
  pdps: 'pdps',
  cdps: 'cdps',
  invul: 'invul',
  stab: 'stab',
  portal: 'portal',
};

const KEYWORDS: [RoleTag, RegExp][] = [
  ['heal', /heal|heil/],
  ['stab', /stab/],
  ['quickness', /quick/],
  ['alacrity', /alac/],
  ['strip', /strip|corrupt/],
  ['cleanse', /cleans/],
  ['pdps', /pdps|power/],
  ['cdps', /cdps|condi/],
  ['tank', /tank/],
  ['portal', /portal/],
  ['stealth', /stealth|veil/],
];

/**
 * Leitet Aufgaben aus Rolle, Name und Spezialisierung ab.
 * Das ist nur ein Vorschlag: Im Formular lassen sich die Tags frei ändern.
 */
export function inferTags(build: Pick<Build, 'name' | 'profession' | 'elite' | 'role'>): RoleTag[] {
  const found = new Set<RoleTag>();

  if (build.profession === GENERIC_PROFESSION) {
    const tag = GENERIC_ELITE_TAGS[normalize(build.elite)];
    if (tag) found.add(tag);
  }

  const text = normalize(`${build.role} ${build.name}`);
  for (const [tag, pattern] of KEYWORDS) {
    if (pattern.test(text)) found.add(tag);
  }

  if (/^dps/.test(normalize(build.role)) && !found.has('cdps')) found.add('pdps');

  return ROLE_TAGS.filter((tag) => found.has(tag));
}

export type TagCounts = Partial<Record<RoleTag, number>>;

export function countTags(
  slots: readonly (number | null)[],
  buildMap: ReadonlyMap<number, Build>,
): TagCounts {
  const counts: TagCounts = {};
  for (const id of slots) {
    const build = id === null ? undefined : buildMap.get(id);
    if (!build) continue;
    for (const tag of build.tags) counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}

export interface RoleOverview {
  groups: { occupied: number; counts: TagCounts; missing: RoleTag[] }[];
  totals: TagCounts;
  /** Zählung nach Freitext-Rolle, absteigend sortiert. */
  roles: { role: string; count: number }[];
  occupied: number;
}

export function roleOverview(
  squad: Squad,
  buildMap: ReadonlyMap<number, Build>,
  required: readonly RoleTag[],
): RoleOverview {
  const groups = squad.groups.map((group) => {
    const counts = countTags(group.slots, buildMap);
    const occupied = group.slots.filter((id) => id !== null && buildMap.has(id)).length;
    // Leere Gruppen gelten nicht als lückenhaft, sie sind schlicht noch nicht geplant.
    const missing = occupied === 0 ? [] : required.filter((tag) => !counts[tag]);
    return { occupied, counts, missing };
  });

  const allSlots = squad.groups.flatMap((group) => group.slots);
  const roleCounts = new Map<string, number>();
  for (const id of allSlots) {
    const build = id === null ? undefined : buildMap.get(id);
    const role = build?.role.trim();
    if (role) roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }

  return {
    groups,
    totals: countTags(allSlots, buildMap),
    roles: [...roleCounts]
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role)),
    occupied: groups.reduce((sum, group) => sum + group.occupied, 0),
  };
}
