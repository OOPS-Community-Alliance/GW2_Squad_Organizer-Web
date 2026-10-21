import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Build } from '../domain/model';
import { iconUrl } from '../domain/professions';
import { I18n } from '../i18n/i18n';
import { Actions } from '../state/actions';
import { AppStore } from '../state/app-store';
import { SelectionState } from '../state/selection';
import { DragPayload } from '../ui/drag/drag-drop';
import { DragSource } from '../ui/drag/drag-source';

@Component({
  selector: 'app-build-card',
  imports: [DragSource],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="card"
      [appDragSource]="payload()"
      [appDragIcon]="icon()"
      [class.selected]="selected()"
      [attr.aria-pressed]="selected()"
      (click)="actions.activateBuild(build().id)"
      (dblclick)="actions.placeInNextFree(build().id)"
    >
      @if (icon(); as icon) {
        <img [src]="icon" alt="" width="48" height="48" draggable="false" />
      }
      <span class="name">{{ build().name }}</span>
      <span class="role">{{ build().role || specLabel() }}</span>
      <span class="visually-hidden">{{ hiddenDetail() }}</span>
      @if (used(); as used) {
        <span class="badge" aria-hidden="true">{{ used }}×</span>
      }
    </button>
  `,
  styleUrl: './build-card.scss',
})
export class BuildCard {
  protected readonly actions = inject(Actions);
  private readonly selection = inject(SelectionState);
  private readonly store = inject(AppStore);
  private readonly i18n = inject(I18n);

  readonly build = input.required<Build>();

  protected readonly icon = computed(() => iconUrl(this.build().profession, this.build().elite));
  protected readonly payload = computed<DragPayload>(() => ({
    kind: 'build',
    buildId: this.build().id,
  }));
  protected readonly selected = computed(() => this.selection.libraryBuildId() === this.build().id);
  protected readonly used = computed(() => this.store.usage().get(this.build().id) ?? 0);
  protected readonly specLabel = computed(() =>
    this.i18n.specLabel(this.build().profession, this.build().elite),
  );
  /** Ergänzt den sichtbaren Text für Screenreader; der sichtbare Text bleibt Teil des Namens (WCAG 2.5.3). */
  protected readonly hiddenDetail = computed(() => {
    const build = this.build();
    const parts =
      build.role && build.role.toLowerCase() !== this.specLabel().toLowerCase()
        ? [this.specLabel()]
        : [];
    const used = this.used();
    if (used) parts.push(this.i18n.t().library.inSquad(used));
    return parts.length ? `, ${parts.join(', ')}` : '';
  });
}
