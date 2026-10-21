import { BreakpointObserver } from '@angular/cdk/layout';
import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { readPref, writePref } from './prefs';

export type View = 'squad' | 'builds' | 'roles';
export type ThemeMode = 'system' | 'light' | 'dark';

/** Ab dieser Breite zwei Spalten, darunter Navigation unten (UGM K8, M3 „expanded“). */
export const EXPANDED_QUERY = '(min-width: 840px)';

function initialTheme(): ThemeMode {
  const saved = readPref('theme');
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

@Injectable({ providedIn: 'root' })
export class Layout {
  private readonly doc = inject(DOCUMENT);

  readonly expanded = toSignal(
    inject(BreakpointObserver)
      .observe(EXPANDED_QUERY)
      .pipe(map((state) => state.matches)),
    { initialValue: this.doc.defaultView?.matchMedia(EXPANDED_QUERY).matches ?? true },
  );

  /** Aktive Ansicht auf schmalen Bildschirmen. */
  readonly view = signal<View>('squad');
  /** Aktiver Tab der rechten Spalte auf breiten Bildschirmen. */
  readonly sideTab = signal<'builds' | 'roles'>('builds');

  readonly theme = signal<ThemeMode>(initialTheme());
  readonly isCompact = computed(() => !this.expanded());

  constructor() {
    effect(() => {
      const theme = this.theme();
      const root = this.doc.documentElement;
      if (theme === 'system') delete root.dataset['theme'];
      else root.dataset['theme'] = theme;
      writePref('theme', theme);
    });
  }

  show(view: View): void {
    this.view.set(view);
    if (view !== 'squad') this.sideTab.set(view);
  }
}
