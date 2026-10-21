import { LiveAnnouncer } from '@angular/cdk/a11y';
import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppStore } from '../state/app-store';
import { I18n } from '../i18n/i18n';

const UNDO_TOAST_MS = 8000;

/** Rückmeldungen an Nutzer: sichtbare Hinweise und Ansagen für Screenreader. */
@Injectable({ providedIn: 'root' })
export class Feedback {
  private readonly snackBar = inject(MatSnackBar);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly store = inject(AppStore);
  private readonly i18n = inject(I18n);

  /** Nur für Screenreader; die Änderung ist auf dem Bildschirm sichtbar. */
  announce(message: string): void {
    void this.announcer.announce(message, 'polite');
  }

  /** Hinweis, der von selbst verschwindet. Die Snackbar sagt ihn auch an. */
  toast(message: string): void {
    this.snackBar.open(message, undefined, { duration: 5000 });
  }

  /** Hinweis mit „Rückgängig“; Undo bleibt danach über Strg+Z und den Button erreichbar. */
  undoable(message: string): void {
    const ref = this.snackBar.open(message, this.i18n.t().common.undo, { duration: UNDO_TOAST_MS });
    ref.onAction().subscribe(() => this.store.undo());
  }

  /** Wichtige Meldung, die stehen bleibt, bis sie geschlossen wird. */
  persistent(message: string, action: string, onAction?: () => void): void {
    const ref = this.snackBar.open(message, action);
    if (onAction) ref.onAction().subscribe(onAction);
  }
}
