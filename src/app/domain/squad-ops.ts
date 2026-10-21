import { Build, Group, LIMITS, SlotRef, SlotValue, Squad } from './model';

/*
 * Reine Funktionen für den Squad. Sie verändern nie das übergebene Objekt,
 * sondern liefern eine neue Version. Das ermöglicht Undo/Redo im Store.
 * Bei unzulässigen Aufrufen (Grenzen überschritten) kommt das Original zurück.
 */

export function emptyGroup(slots: number = LIMITS.defaultSlots): Group {
  return { slots: Array.from({ length: slots }, () => null) };
}

export function createSquad(id: string, name: string, now: string): Squad {
  return { id, name, groups: [emptyGroup()], updatedAt: now };
}

function withGroups(squad: Squad, groups: Group[]): Squad {
  return { ...squad, groups };
}

function updateGroup(squad: Squad, index: number, update: (group: Group) => Group): Squad {
  if (!squad.groups[index]) return squad;
  return withGroups(
    squad,
    squad.groups.map((group, i) => (i === index ? update(group) : group)),
  );
}

export function canAddGroup(squad: Squad): boolean {
  return squad.groups.length < LIMITS.maxGroups;
}

export function addGroup(squad: Squad): Squad {
  return canAddGroup(squad) ? withGroups(squad, [...squad.groups, emptyGroup()]) : squad;
}

export function removeGroup(squad: Squad, index: number): Squad {
  if (squad.groups.length <= 1 || !squad.groups[index]) return squad;
  return withGroups(
    squad,
    squad.groups.filter((_, i) => i !== index),
  );
}

export function clearGroup(squad: Squad, index: number): Squad {
  return updateGroup(squad, index, (group) => emptyGroup(group.slots.length));
}

export function canAddSlot(squad: Squad, index: number): boolean {
  const group = squad.groups[index];
  return !!group && group.slots.length < LIMITS.maxSlots;
}

export function addSlot(squad: Squad, index: number): Squad {
  if (!canAddSlot(squad, index)) return squad;
  return updateGroup(squad, index, (group) => ({ slots: [...group.slots, null] }));
}

export function canRemoveSlot(squad: Squad, index: number): boolean {
  const group = squad.groups[index];
  return !!group && group.slots.length > 1;
}

/** Entfernt den letzten Slot der Gruppe, wie remove_slot() im Original. */
export function removeLastSlot(squad: Squad, index: number): Squad {
  if (!canRemoveSlot(squad, index)) return squad;
  return updateGroup(squad, index, (group) => ({ slots: group.slots.slice(0, -1) }));
}

export function slotValue(squad: Squad, ref: SlotRef): SlotValue | undefined {
  return squad.groups[ref.group]?.slots[ref.slot];
}

function setSlot(squad: Squad, ref: SlotRef, value: SlotValue): Squad {
  if (slotValue(squad, ref) === undefined) return squad;
  return updateGroup(squad, ref.group, (group) => ({
    slots: group.slots.map((current, i) => (i === ref.slot ? value : current)),
  }));
}

export function placeBuild(squad: Squad, ref: SlotRef, buildId: number): Squad {
  return setSlot(squad, ref, buildId);
}

export function clearSlot(squad: Squad, ref: SlotRef): Squad {
  return setSlot(squad, ref, null);
}

/** Verschiebt einen Slot-Inhalt. Ist das Ziel belegt, tauschen beide die Plätze. */
export function moveSlot(squad: Squad, from: SlotRef, to: SlotRef): Squad {
  const source = slotValue(squad, from);
  const target = slotValue(squad, to);
  if (source === undefined || target === undefined) return squad;
  if (from.group === to.group && from.slot === to.slot) return squad;
  return setSlot(setSlot(squad, to, source), from, target);
}

/** Setzt den Squad auf eine Gruppe mit fünf leeren Slots zurück (clear_squad()). */
export function resetSquad(squad: Squad): Squad {
  return withGroups(squad, [emptyGroup()]);
}

export function removeBuildEverywhere(squad: Squad, buildId: number): Squad {
  if (!squad.groups.some((group) => group.slots.includes(buildId))) return squad;
  return withGroups(
    squad,
    squad.groups.map((group) => ({
      slots: group.slots.map((id) => (id === buildId ? null : id)),
    })),
  );
}

export function firstEmptySlot(squad: Squad): SlotRef | null {
  for (let group = 0; group < squad.groups.length; group++) {
    const slot = squad.groups[group].slots.indexOf(null);
    if (slot !== -1) return { group, slot };
  }
  return null;
}

export function usageCounts(squad: Squad): Map<number, number> {
  const counts = new Map<number, number>();
  for (const group of squad.groups) {
    for (const id of group.slots) {
      if (id !== null) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

export function occupiedCount(squad: Squad): number {
  return squad.groups.reduce(
    (sum, group) => sum + group.slots.filter((id) => id !== null).length,
    0,
  );
}

export function slotCount(squad: Squad): number {
  return squad.groups.reduce((sum, group) => sum + group.slots.length, 0);
}

/** Builds in der Reihenfolge ihres ersten Auftretens im Squad, mit Anzahl. */
export function buildsInSquad(
  squad: Squad,
  buildMap: ReadonlyMap<number, Build>,
): { build: Build; count: number }[] {
  const result = new Map<number, { build: Build; count: number }>();
  for (const group of squad.groups) {
    for (const id of group.slots) {
      const build = id === null ? undefined : buildMap.get(id);
      if (!build) continue;
      const entry = result.get(build.id);
      if (entry) entry.count++;
      else result.set(build.id, { build, count: 1 });
    }
  }
  return [...result.values()];
}
