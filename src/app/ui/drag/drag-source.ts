import { Directive, inject, input } from '@angular/core';
import { DragDrop, DragPayload } from './drag-drop';

/** Macht ein Element ziehbar. Klick und Tastatur bleiben unverändert nutzbar. */
@Directive({
  selector: '[appDragSource]',
  host: {
    class: 'drag-source',
    '(pointerdown)': 'onPointerDown($event)',
    '(dragstart)': '$event.preventDefault()',
  },
})
export class DragSource {
  private readonly drag = inject(DragDrop);

  readonly payload = input.required<DragPayload | null>({ alias: 'appDragSource' });
  readonly icon = input<string | null>(null, { alias: 'appDragIcon' });

  protected onPointerDown(event: PointerEvent): void {
    const payload = this.payload();
    if (payload) this.drag.press(payload, event, this.icon());
  }
}
