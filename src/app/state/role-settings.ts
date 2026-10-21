import { effect, Injectable, signal } from '@angular/core';
import { DEFAULT_REQUIRED_TAGS, isRoleTag, ROLE_TAGS, RoleTag } from '../domain/professions';
import { readPref, writePref } from './prefs';

function initialTags(): RoleTag[] {
  try {
    const saved = JSON.parse(readPref('requiredTags') ?? 'null');
    if (Array.isArray(saved))
      return ROLE_TAGS.filter((tag) => saved.filter(isRoleTag).includes(tag));
  } catch {
    // Ungültiger Wert: Standard verwenden.
  }
  return [...DEFAULT_REQUIRED_TAGS];
}

/** Welche Aufgaben die Rollen-Übersicht in jeder Gruppe prüft. */
@Injectable({ providedIn: 'root' })
export class RoleSettings {
  readonly required = signal<RoleTag[]>(initialTags());

  constructor() {
    effect(() => writePref('requiredTags', JSON.stringify(this.required())));
  }

  set(tags: RoleTag[]): void {
    this.required.set(ROLE_TAGS.filter((tag) => tags.includes(tag)));
  }
}
