import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { I18n } from './i18n/i18n';
import { LibraryPanel } from './library/library-panel';
import { RoleOverview } from './roles/role-overview';
import { SelectionBar } from './selection/selection-bar';
import { TopBar } from './shell/top-bar';
import { SquadPanel } from './squad/squad-panel';
import { Actions } from './state/actions';
import { AppStore } from './state/app-store';
import { Layout, View } from './state/layout';
import { SelectionState } from './state/selection';
import { DragDrop } from './ui/drag/drag-drop';
import { Feedback } from './ui/feedback';

@Component({
  selector: 'app-root',
  imports: [
    TopBar,
    SquadPanel,
    LibraryPanel,
    RoleOverview,
    SelectionBar,
    MatTabsModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(window:hashchange)': 'actions.handleShareLink()',
  },
})
export class App {
  protected readonly layout = inject(Layout);
  protected readonly actions = inject(Actions);
  protected readonly i18n = inject(I18n);
  protected readonly selection = inject(SelectionState);
  private readonly store = inject(AppStore);
  private readonly feedback = inject(Feedback);
  private readonly dialog = inject(MatDialog);
  private readonly doc = inject(DOCUMENT);

  protected readonly views: { id: View; icon: string }[] = [
    { id: 'squad', icon: 'groups' },
    { id: 'builds', icon: 'library_books' },
    { id: 'roles', icon: 'checklist' },
  ];

  constructor() {
    inject(DragDrop).register(this.actions);
    void this.actions.handleShareLink();

    effect(() => {
      const notice = this.store.notice();
      if (!notice) return;
      untracked(() => {
        const t = this.i18n.t().storage;
        if (notice.kind === 'synced') this.feedback.toast(t.synced);
        else
          this.feedback.persistent(
            notice.kind === 'corrupt' ? t.corrupt : t.saveFailed,
            this.i18n.t().common.close,
          );
      });
    });

    const updates = inject(SwUpdate);
    if (updates.isEnabled) {
      updates.versionUpdates
        .pipe(
          filter((event) => event.type === 'VERSION_READY'),
          takeUntilDestroyed(),
        )
        .subscribe(() => {
          const t = this.i18n.t().update;
          this.feedback.persistent(t.ready, t.reload, () => this.doc.location.reload());
        });
    }
  }

  protected viewLabel(view: View): string {
    return this.i18n.t().nav[view];
  }

  /** Globale Kürzel. In Textfeldern und offenen Dialogen bleiben die Browser-Standards erhalten. */
  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (this.dialog.openDialogs.length) return;

    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.actions.undo();
    } else if (mod && ((key === 'z' && event.shiftKey) || key === 'y')) {
      event.preventDefault();
      this.actions.redo();
    } else if (event.key === 'Escape' && this.selection.current()) {
      this.selection.clear();
    }
  }
}
