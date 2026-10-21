import { Build } from '../domain/model';

/** Sucht in Name, Rolle, Klasse und Spezialisierung, ohne Groß-/Kleinschreibung. */
export function matchesQuery(build: Build, query: string, professionLabel: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [build.name, build.role, build.elite, build.profession, professionLabel].some((value) =>
    value.toLowerCase().includes(needle),
  );
}
