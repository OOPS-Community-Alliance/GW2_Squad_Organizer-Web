import { Profession, RoleTag } from './professions';

export interface Build {
  /** Numerisch wie in der Desktop-App, damit Exporte in beide Richtungen funktionieren. */
  id: number;
  name: string;
  profession: Profession;
  elite: string;
  /** Freitext-Rolle, z. B. „Boonstrip“. */
  role: string;
  link: string;
  tags: RoleTag[];
  /** ISO-8601-Zeitstempel der letzten Änderung. */
  updatedAt: string;
}

export type BuildInput = Omit<Build, 'id' | 'updatedAt'>;

/** Ein Slot enthält die ID eines Builds oder ist leer. */
export type SlotValue = number | null;

export interface Group {
  slots: SlotValue[];
}

export interface Squad {
  id: string;
  name: string;
  groups: Group[];
  updatedAt: string;
}

export interface AppData {
  version: 1;
  builds: Build[];
  squads: Squad[];
  activeSquadId: string;
}

export interface SlotRef {
  group: number;
  slot: number;
}

export const LIMITS = {
  maxGroups: 15,
  maxSlots: 10,
  defaultSlots: 5,
  /** Ein WvW-Squad fasst höchstens 50 Personen. */
  squadCap: 50,
  nameMaxLength: 60,
  roleMaxLength: 40,
  linkMaxLength: 500,
} as const;

/** Nur http(s)-Links sind erlaubt; alles andere (z. B. javascript:) wird verworfen. */
export function sanitizeLink(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > LIMITS.linkMaxLength) return '';
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function linkHost(link: string): string {
  try {
    return new URL(link).host;
  } catch {
    return '';
  }
}

/** Schlüssel zum Erkennen doppelter Builds (wie build_key() im Original). */
export function buildKey(build: Pick<Build, 'name' | 'profession' | 'elite' | 'role'>): string {
  return [build.name.trim().toLowerCase(), build.profession, build.elite, build.role.trim()].join(
    '\u0000',
  );
}
