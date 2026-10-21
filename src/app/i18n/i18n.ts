import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { de, Messages } from './messages.de';
import { en } from './messages.en';
import { readPref, writePref } from '../state/prefs';

export type Lang = 'de' | 'en';
export const LANGS: readonly Lang[] = ['de', 'en'];

const DICTIONARIES: Record<Lang, Messages> = { de, en };

function initialLang(): Lang {
  const saved = readPref('lang');
  if (saved === 'de' || saved === 'en') return saved;
  const browser = typeof navigator === 'undefined' ? 'de' : navigator.language.toLowerCase();
  return browser.startsWith('de') ? 'de' : 'en';
}

/**
 * Schlanker, typisierter Übersetzungsdienst. Sprachwechsel zur Laufzeit ohne Neuladen,
 * deshalb hier statt @angular/localize (das einen Build pro Sprache erzeugt).
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly doc = inject(DOCUMENT);

  readonly lang = signal<Lang>(initialLang());
  readonly t = computed(() => DICTIONARIES[this.lang()]);
  readonly locale = computed(() => (this.lang() === 'de' ? 'de-DE' : 'en-GB'));

  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeStyle: 'short' }),
  );

  constructor() {
    effect(() => {
      const lang = this.lang();
      this.doc.documentElement.lang = lang;
      writePref('lang', lang);
    });
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : this.dateFormat().format(date);
  }

  /** Anzeigename einer Klasse; nur „Allgemein“ wird übersetzt. */
  profession(name: string): string {
    return name === 'Allgemein' ? this.t().generic : name;
  }

  /** „Firebrand“ oder bei Core der Klassenname. */
  specLabel(profession: string, elite: string): string {
    return elite === 'Core' ? `${this.profession(profession)} (Core)` : elite;
  }

  /** Spezialisierung und Rolle, ohne Dopplung wie „Heal · Heal“. */
  buildDetail(
    build: { profession: string; elite: string; role: string },
    separator = ' · ',
  ): string {
    const spec = this.specLabel(build.profession, build.elite);
    const role = build.role.trim();
    return role && role.toLowerCase() !== spec.toLowerCase() ? `${spec}${separator}${role}` : spec;
  }
}
