import { ImportError, SquadBundle } from './bundle';
import { Build, LIMITS, sanitizeLink, Squad } from './model';
import { GENERIC_PROFESSION, isProfession, isRoleTag, legacyIconPath } from './professions';
import { inferTags } from './role-tags';
import { fromLegacyTime, toLegacyTime } from './time';

/*
 * JSON-Format der Desktop-App (squadtool.py, export_data/import_data).
 * Die Web-App schreibt dasselbe Format, damit Dateien in beide Richtungen funktionieren.
 * Zusätzliche Felder (app, version, squad_name, tags) ignoriert die Desktop-App.
 */

export interface LegacyBuild {
  id: number;
  name: string;
  klasse: string;
  elite: string;
  rolle: string;
  link: string;
  icon: string;
  zeit: string;
  tags?: string[];
}

export interface LegacyFile {
  app?: string;
  version?: number;
  squad_name?: string;
  builds: LegacyBuild[];
  squad: { build_id: number | null; group: number; slot: number }[];
  group_slots: Record<string, number>;
}

export const LEGACY_APP_ID = 'gw2-squad-organizer-web';

export function toLegacyFile(squad: Squad, builds: readonly Build[]): LegacyFile {
  return {
    app: LEGACY_APP_ID,
    version: 2,
    squad_name: squad.name,
    builds: builds.map((build) => ({
      id: build.id,
      name: build.name,
      klasse: build.profession,
      elite: build.elite,
      rolle: build.role,
      link: build.link,
      icon: legacyIconPath(build.profession, build.elite),
      zeit: toLegacyTime(build.updatedAt),
      tags: [...build.tags],
    })),
    squad: squad.groups.flatMap((group, groupIndex) =>
      group.slots.map((buildId, slot) => ({ build_id: buildId, group: groupIndex, slot })),
    ),
    group_slots: Object.fromEntries(
      squad.groups.map((group, index) => [String(index), group.slots.length]),
    ),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toInt(value: unknown): number | null {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isInteger(number) ? number : null;
}

const text = (value: unknown, max: number) =>
  (typeof value === 'string' ? value : value == null ? '' : String(value)).trim().slice(0, max);

function parseBuild(raw: unknown, index: number, now: string): Build {
  if (!isRecord(raw)) throw new ImportError('buildInvalid', index + 1);
  const id = toInt(raw['id']);
  const name = text(raw['name'], LIMITS.nameMaxLength);
  if (
    id === null ||
    !name ||
    typeof raw['klasse'] !== 'string' ||
    typeof raw['elite'] !== 'string'
  ) {
    throw new ImportError('buildInvalid', index + 1);
  }

  // Unbekannte Klassen landen bei „Allgemein“, statt den ganzen Import abzubrechen.
  const rawProfession = raw['klasse'];
  const known = isProfession(rawProfession);
  const profession = known ? rawProfession : GENERIC_PROFESSION;
  const elite = known ? text(raw['elite'], LIMITS.nameMaxLength) || 'Core' : 'Core';
  const role = text(raw['rolle'], LIMITS.roleMaxLength);

  const rawTags = raw['tags'];
  const tags = Array.isArray(rawTags)
    ? [...new Set(rawTags.filter(isRoleTag))]
    : inferTags({ name, profession, elite, role });

  return {
    id,
    name,
    profession,
    elite,
    role,
    link: sanitizeLink(raw['link']),
    tags,
    updatedAt: fromLegacyTime(raw['zeit'], now),
  };
}

/** Prüft wie import_data(): erst alles validieren, dann übernehmen. */
export function parseLegacyFile(json: string, fallbackName: string, now: string): SquadBundle {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ImportError('notJson');
  }

  if (
    !isRecord(data) ||
    !Array.isArray(data['builds']) ||
    !Array.isArray(data['squad']) ||
    !isRecord(data['group_slots'])
  ) {
    throw new ImportError('structure');
  }

  const builds = data['builds'].map((raw, index) => parseBuild(raw, index, now));
  const ids = new Set<number>();
  for (const build of builds) {
    if (ids.has(build.id)) throw new ImportError('duplicateBuildId', build.id);
    ids.add(build.id);
  }

  const groupSlots = new Map<number, number>();
  for (const [key, value] of Object.entries(data['group_slots'])) {
    const group = toInt(key);
    const slots = toInt(value);
    if (group === null || group < 0 || group >= LIMITS.maxGroups) {
      throw new ImportError('groupIndex', key);
    }
    if (slots === null || slots < 1 || slots > LIMITS.maxSlots) {
      throw new ImportError('slotCount', group + 1);
    }
    groupSlots.set(group, slots);
  }
  if (groupSlots.size < 1 || groupSlots.size > LIMITS.maxGroups) {
    throw new ImportError('groupCount');
  }

  // Gruppennummern müssen nicht lückenlos sein; die Reihenfolge bleibt erhalten.
  const order = [...groupSlots.keys()].sort((a, b) => a - b);
  const groups = order.map((key) => ({
    slots: Array.from({ length: groupSlots.get(key)! }, () => null as number | null),
  }));

  const occupied = new Set<string>();
  for (const entry of data['squad']) {
    if (!isRecord(entry)) throw new ImportError('structure');
    const groupKey = toInt(entry['group']);
    const slot = toInt(entry['slot']);
    const groupIndex = groupKey === null ? -1 : order.indexOf(groupKey);
    if (groupIndex === -1) throw new ImportError('entryGroup', String(entry['group']));
    if (slot === null || slot < 0 || slot >= groups[groupIndex].slots.length) {
      throw new ImportError('entrySlot', groupIndex + 1);
    }

    const position = `${groupIndex}:${slot}`;
    if (occupied.has(position)) throw new ImportError('slotTwice', `${groupIndex + 1}/${slot + 1}`);
    occupied.add(position);

    const rawId = entry['build_id'];
    if (rawId === null || rawId === undefined) continue;
    const buildId = toInt(rawId);
    if (buildId === null || !ids.has(buildId)) throw new ImportError('missingBuild', String(rawId));
    groups[groupIndex].slots[slot] = buildId;
  }

  const name = text(data['squad_name'], LIMITS.nameMaxLength) || fallbackName;
  return { name, builds, groups };
}
