import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SlotRef, SlotValue } from '../domain/model';
import { iconUrl } from '../domain/professions';
import { I18n } from '../i18n/i18n';
import { Actions } from '../state/actions';
import { AppStore } from '../state/app-store';
import { sameRef, SelectionState } from '../state/selection';
import { DragDrop, DragPayload, slotKey } from '../ui/drag/drag-drop';
import { DragSource } from '../ui/drag/drag-source';

@Component({
  selector: 'app-slot',
  imports: [DragSource, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="slot"
      [attr.data-drop-slot]="key()"
      [attr.data-slot-key]="key()"
      [tabIndex]="tabbable() ? 0 : -1"
      [appDragSource]="payload()"
      [appDragIcon]="icon()"
      [class.filled]="!!build()"
      [class.selected]="selected()"
      [class.related]="related()"
      [class.target]="target()"
      [class.over]="drag.over() === key()"
      [class.origin]="origin()"
      [attr.aria-label]="label()"
      [attr.aria-pressed]="build() ? selected() : null"
      [matTooltip]="build()?.name ?? ''"
      [matTooltipDisabled]="!build()"
      matTooltipTouchGestures="off"
      (click)="actions.activateSlot(ref())"
    >
      @if (build(); as build) {
        @if (icon(); as icon) {
          <img [src]="icon" alt="" width="40" height="40" draggable="false" />
        } @else {
          <span class="fallback" aria-hidden="true">{{ build.name.slice(0, 3) }}</span>
        }
      } @else if (target()) {
        <mat-icon class="hint" svgIcon="add" aria-hidden="true" />
      } @else {
        <span class="dot" aria-hidden="true"></span>
      }
    </button>
  `,
  styleUrl: './slot.scss',
})
export class Slot {
  protected readonly actions = inject(Actions);
  protected readonly drag = inject(DragDrop);
  private readonly store = inject(AppStore);
  private readonly selection = inject(SelectionState);
  private readonly i18n = inject(I18n);

  readonly ref = input.required<SlotRef>();
  readonly value = input.required<SlotValue>();
  readonly tabbable = input(false);

  protected readonly key = computed(() => slotKey(this.ref()));
  protected readonly build = computed(() => {
    const id = this.value();
    return id === null ? null : (this.store.buildMap().get(id) ?? null);
  });
  protected readonly icon = computed(() => {
    const build = this.build();
    return build ? iconUrl(build.profession, build.elite) : null;
  });
  protected readonly payload = computed<DragPayload | null>(() => {
    const build = this.build();
    return build ? { kind: 'slot', ref: this.ref(), buildId: build.id } : null;
  });

  protected readonly selected = computed(() => {
    const ref = this.selection.slot();
    return !!ref && sameRef(ref, this.ref());
  });
  /** Gleicher Build wie die aktuelle Auswahl (wie update_build_selection() im Original). */
  protected readonly related = computed(() => {
    const build = this.build();
    return !!build && !this.selected() && this.selection.build()?.id === build.id;
  });
  /** Zeigt an, dass ein Antippen hier platziert oder tauscht. */
  protected readonly target = computed(() => {
    const selection = this.selection.current();
    if (!selection) return false;
    return selection.kind === 'build' || !this.selected();
  });
  protected readonly origin = computed(() => {
    const active = this.drag.active();
    return active?.kind === 'slot' && sameRef(active.ref, this.ref());
  });

  protected readonly label = computed(() => {
    const t = this.i18n.t();
    const g = this.ref().group + 1;
    const s = this.ref().slot + 1;
    const build = this.build();
    const base = build
      ? t.slot.filled(g, s, build.name, this.i18n.buildDetail(build, ', '))
      : t.slot.empty(g, s);
    const selected = this.selection.current();
    if (selected?.kind === 'build' && this.target()) {
      return `${base}. ${t.slot.placeHere(this.selection.build()?.name ?? '')}`;
    }
    if (selected?.kind === 'slot' && this.target()) return `${base}. ${t.slot.swapHere}`;
    return base;
  });
}
