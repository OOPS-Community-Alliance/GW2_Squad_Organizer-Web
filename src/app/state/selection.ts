import { computed, inject, Injectable, signal } from '@angular/core';
import { Build, SlotRef } from '../domain/model';
import { slotValue } from '../domain/squad-ops';
import { AppStore } from './app-store';

export type Selection = { kind: 'build'; buildId: number } | { kind: 'slot'; ref: SlotRef } | null;

export const sameRef = (a: SlotRef, b: SlotRef) => a.group === b.group && a.slot === b.slot;

/**
 * Auswahl als Alternative zum Ziehen (WCAG 2.5.7): Build oder Slot wählen,
 * dann einen Ziel-Slot antippen. Ungültig gewordene Auswahl (gelöschter Build,
 * geleerter Slot) wird automatisch zu „nichts ausgewählt“.
 */
@Injectable({ providedIn: 'root' })
export class SelectionState {
  private readonly store = inject(AppStore);
  private readonly raw = signal<Selection>(null);

  readonly current = computed<Selection>(() => {
    const selection = this.raw();
    if (!selection) return null;
    if (selection.kind === 'build') {
      return this.store.buildMap().has(selection.buildId) ? selection : null;
    }
    const id = slotValue(this.store.activeSquad(), selection.ref);
    return id !== null && id !== undefined && this.store.buildMap().has(id) ? selection : null;
  });

  /** Der ausgewählte Build, egal ob aus der Bibliothek oder aus einem Slot. */
  readonly build = computed<Build | null>(() => {
    const selection = this.current();
    if (!selection) return null;
    const id =
      selection.kind === 'build'
        ? selection.buildId
        : slotValue(this.store.activeSquad(), selection.ref);
    return (id !== null && id !== undefined && this.store.buildMap().get(id)) || null;
  });

  readonly slot = computed(() => {
    const selection = this.current();
    return selection?.kind === 'slot' ? selection.ref : null;
  });

  readonly libraryBuildId = computed(() => {
    const selection = this.current();
    return selection?.kind === 'build' ? selection.buildId : null;
  });

  selectBuild(buildId: number): void {
    this.raw.set({ kind: 'build', buildId });
  }

  selectSlot(ref: SlotRef): void {
    this.raw.set({ kind: 'slot', ref });
  }

  clear(): void {
    this.raw.set(null);
  }
}
