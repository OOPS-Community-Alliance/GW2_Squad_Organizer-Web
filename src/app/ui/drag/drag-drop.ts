import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { SlotRef } from '../../domain/model';

export type DragPayload =
  { kind: 'build'; buildId: number } | { kind: 'slot'; ref: SlotRef; buildId: number };

export interface DropHandler {
  drop(payload: DragPayload, target: SlotRef): void;
  /** Loslassen außerhalb des Squads: Slot-Inhalte werden entfernt (wie im Original). */
  dropOutside(payload: DragPayload): void;
}

const MOUSE_THRESHOLD = 5;
const TOUCH_SLOP = 10;
const LONG_PRESS_MS = 350;
const EDGE = 56;
const MAX_SCROLL_SPEED = 18;

export const slotKey = (ref: SlotRef) => `${ref.group}:${ref.slot}`;

function parseSlotKey(key: string | undefined): SlotRef | null {
  const match = key ? /^(\d+):(\d+)$/.exec(key) : null;
  return match ? { group: Number(match[1]), slot: Number(match[2]) } : null;
}

/**
 * Ziehen und Ablegen mit Pointer Events: Maus und Stift starten nach kurzer Bewegung,
 * Touch nach langem Drücken (sonst scrollt die Seite normal). Ziele sind Elemente mit
 * `data-drop-slot="Gruppe:Slot"`. Jede Funktion ist zusätzlich per Auswahl erreichbar.
 */
@Injectable({ providedIn: 'root' })
export class DragDrop {
  private readonly doc = inject(DOCUMENT);
  private handler: DropHandler | null = null;
  private busy = false;

  readonly active = signal<DragPayload | null>(null);
  readonly over = signal<string | null>(null);

  register(handler: DropHandler): void {
    this.handler = handler;
  }

  press(payload: DragPayload, down: PointerEvent, iconUrl: string | null): void {
    if (down.button !== 0 || this.busy || !this.handler) return;
    this.busy = true;

    const win = this.doc.defaultView!;
    const touch = down.pointerType === 'touch';
    let started = false;
    let x = down.clientX;
    let y = down.clientY;
    let ghost: HTMLElement | null = null;
    let scrollFrame = 0;
    let longPress: ReturnType<typeof setTimeout> | undefined;

    const start = () => {
      started = true;
      this.active.set(payload);
      ghost = this.createGhost(iconUrl);
      position();
      if (touch) navigator.vibrate?.(10);
      scrollFrame = win.requestAnimationFrame(autoScroll);
    };

    const position = () => {
      if (ghost) ghost.style.transform = `translate(${x - 24}px, ${y - 24}px)`;
      const target = this.doc.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-slot]');
      this.over.set(target?.dataset['dropSlot'] ?? null);
    };

    const autoScroll = () => {
      const container = this.doc.elementFromPoint(x, y)?.closest<HTMLElement>('[data-autoscroll]');
      if (container) {
        const rect = container.getBoundingClientRect();
        const ratio = (edge: number) => Math.max(0, Math.min(1, (EDGE - edge) / EDGE));
        const speed = ratio(y - rect.top) > 0 ? -ratio(y - rect.top) : ratio(rect.bottom - y);
        if (speed) {
          container.scrollBy(0, speed * MAX_SCROLL_SPEED);
          position();
        }
      }
      scrollFrame = win.requestAnimationFrame(autoScroll);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== down.pointerId) return;
      x = event.clientX;
      y = event.clientY;
      if (!started) {
        const distance = Math.hypot(x - down.clientX, y - down.clientY);
        if (touch) {
          if (distance > TOUCH_SLOP) finish(false);
          return;
        }
        if (distance < MOUSE_THRESHOLD) return;
        start();
      }
      event.preventDefault();
      position();
    };

    // Solange gezogen wird, darf die Seite nicht scrollen (nur mit passive: false möglich).
    const onTouchMove = (event: TouchEvent) => {
      if (started && event.cancelable) event.preventDefault();
    };
    const onContextMenu = (event: Event) => {
      if (touch) event.preventDefault();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== down.pointerId) return;
      x = event.clientX;
      y = event.clientY;
      finish(started);
    };
    const onCancel = () => finish(false);

    const finish = (commit: boolean) => {
      clearTimeout(longPress);
      win.cancelAnimationFrame(scrollFrame);
      win.removeEventListener('pointermove', onMove);
      win.removeEventListener('pointerup', onUp);
      win.removeEventListener('pointercancel', onCancel);
      win.removeEventListener('touchmove', onTouchMove);
      win.removeEventListener('contextmenu', onContextMenu);
      win.removeEventListener('keydown', onKey, true);
      ghost?.remove();

      if (started) {
        this.suppressNextClick();
        if (commit) {
          const element = this.doc.elementFromPoint(x, y);
          const target = parseSlotKey(
            element?.closest<HTMLElement>('[data-drop-slot]')?.dataset['dropSlot'],
          );
          if (target) this.handler?.drop(payload, target);
          else if (!element?.closest('[data-squad-area]')) this.handler?.dropOutside(payload);
        }
      }

      this.active.set(null);
      this.over.set(null);
      this.busy = false;
    };

    win.addEventListener('pointermove', onMove, { passive: false });
    win.addEventListener('pointerup', onUp);
    win.addEventListener('pointercancel', onCancel);
    win.addEventListener('touchmove', onTouchMove, { passive: false });
    win.addEventListener('contextmenu', onContextMenu);
    win.addEventListener('keydown', onKey, true);
    if (touch) longPress = setTimeout(start, LONG_PRESS_MS);
  }

  private createGhost(iconUrl: string | null): HTMLElement {
    const ghost = this.doc.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    if (iconUrl) {
      const img = this.doc.createElement('img');
      img.src = iconUrl;
      img.alt = '';
      ghost.append(img);
    }
    this.doc.body.append(ghost);
    return ghost;
  }

  /** Nach dem Ablegen löst der Browser noch einen Klick aus; der soll nichts auswählen. */
  private suppressNextClick(): void {
    const win = this.doc.defaultView!;
    const swallow = (event: Event) => {
      event.stopPropagation();
      event.preventDefault();
    };
    win.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => win.removeEventListener('click', swallow, { capture: true }), 0);
  }
}
