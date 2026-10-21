import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SquadBundle } from '../domain/bundle';
import { iconUrl } from '../domain/professions';
import { I18n } from '../i18n/i18n';

@Component({
  selector: 'app-share-import-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = i18n.t().share;
    <h2 mat-dialog-title>{{ t.importTitle }}</h2>
    <mat-dialog-content>
      <p>{{ t.importText(name, bundle.builds.length, occupied, bundle.groups.length) }}</p>
      <ul class="groups" role="list">
        @for (group of bundle.groups; track $index) {
          <li>
            <span class="label">{{ i18n.t().group.title($index + 1) }}</span>
            <span class="icons">
              @for (id of group.slots; track $index) {
                @if (id !== null && byId.get(id); as build) {
                  <img
                    [src]="icon(build.profession, build.elite)"
                    [alt]="build.name"
                    [title]="build.name"
                    width="28"
                    height="28"
                  />
                } @else {
                  <span class="empty" aria-hidden="true"></span>
                }
              }
            </span>
          </li>
        }
      </ul>
      <p class="note">{{ t.importNote }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>{{ t.discard }}</button>
      <button matButton="filled" type="button" [mat-dialog-close]="true">
        {{ t.importAction }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .groups {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--ugm-space-2);
    }
    li {
      display: flex;
      align-items: center;
      gap: var(--ugm-space-3);
      flex-wrap: wrap;
    }
    .label {
      font: var(--ugm-type-label-l);
      min-inline-size: 5.5rem;
    }
    .icons {
      display: flex;
      gap: var(--ugm-space-1);
      flex-wrap: wrap;
    }
    .empty {
      inline-size: 28px;
      block-size: 28px;
      border-radius: var(--ugm-shape-xs);
      border: 1px dashed var(--mat-sys-outline-variant);
    }
    .note {
      color: var(--mat-sys-on-surface-variant);
      font: var(--ugm-type-body-m);
    }
  `,
})
export class ShareImportDialog {
  protected readonly bundle = inject<SquadBundle>(MAT_DIALOG_DATA);
  protected readonly i18n = inject(I18n);

  protected readonly name = this.bundle.name || this.i18n.t().share.sharedName;
  protected readonly byId = new Map(this.bundle.builds.map((build) => [build.id, build]));
  protected readonly occupied = this.bundle.groups.reduce(
    (sum, group) => sum + group.slots.filter((id) => id !== null).length,
    0,
  );
  protected icon(profession: string, elite: string): string {
    return iconUrl(profession, elite) ?? '';
  }
}
