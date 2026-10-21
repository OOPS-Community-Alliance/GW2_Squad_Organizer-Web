import { SquadBundle } from './bundle';
import { Build, buildKey, Group } from './model';

export function nextBuildId(builds: readonly Build[]): number {
  return builds.reduce((max, build) => Math.max(max, build.id), 0) + 1;
}

export interface MergeResult {
  builds: Build[];
  groups: Group[];
  added: number;
  reused: number;
}

/**
 * Führt importierte Builds mit der Bibliothek zusammen. Gleiche Builds (Name, Klasse,
 * Elite, Rolle) werden wiederverwendet, neue bekommen eine freie ID. Die Slots des
 * Bundles werden auf die neuen IDs umgeschrieben.
 */
export function mergeBundle(library: readonly Build[], bundle: SquadBundle): MergeResult {
  const byKey = new Map(library.map((build) => [buildKey(build), build.id]));
  const idMap = new Map<number, number>();
  const builds = [...library];
  let nextId = nextBuildId(library);
  let added = 0;
  let reused = 0;

  for (const build of bundle.builds) {
    const key = buildKey(build);
    const existing = byKey.get(key);
    if (existing !== undefined) {
      idMap.set(build.id, existing);
      reused++;
      continue;
    }
    const id = nextId++;
    builds.push({ ...build, id });
    byKey.set(key, id);
    idMap.set(build.id, id);
    added++;
  }

  const groups = bundle.groups.map((group) => ({
    slots: group.slots.map((id) => (id === null ? null : (idMap.get(id) ?? null))),
  }));

  return { builds, groups, added, reused };
}
