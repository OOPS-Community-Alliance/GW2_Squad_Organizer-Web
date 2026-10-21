import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SlotRef } from '../domain/model';
import { iconUrl } from '../domain/professions';
import { I18n } from '../i18n/i18n';
import { AppStore } from '../state/app-store';
import { matchesQuery } from '../library/library-filter';

export interface PickerData {
  ref: SlotRef;
}

/** Ergebnis: ID des gewählten Builds oder „create“ für einen neuen Build. */
export type PickerResult = number | 'create';

@Component({
  selector: 'app-build-picker-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = i18n.t();
    <h2 mat-dialog-title>{{ t.picker.title(data.ref.group + 1, data.ref.slot + 1) }}</h2>
    @if (store.builds().length) {
      <!-- Außerhalb des scrollenden Inhalts: bleibt sichtbar, und der Fokus schiebt das Label nicht weg. -->
      <div class="search">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ t.library.searchLabel }}</mat-label>
          <mat-icon matPrefix svgIcon="search" />
          <input
            matInput
            type="search"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
        </mat-form-field>
      </div>
    }
    <mat-dialog-content class="content">
      @if (store.builds().length) {
        <ul class="list" role="list">
          @for (build of builds(); track build.id) {
            <li>
              <button type="button" class="item" (click)="ref.close(build.id)">
                @if (iconUrl(build.profession, build.elite); as icon) {
                  <img [src]="icon" alt="" width="40" height="40" />
                }
                <span class="text">
                  <span class="name">{{ build.name }}</span>
                  <span class="meta">{{ i18n.buildDetail(build) }}</span>
                </span>
                @if (store.usage().get(build.id); as used) {
                  <span class="badge">{{ t.library.inSquad(used) }}</span>
                }
              </button>
            </li>
          } @empty {
            <li class="empty">{{ t.library.noMatch }}</li>
          }
        </ul>
      } @else {
        <p>{{ t.picker.empty }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>{{ t.common.cancel }}</button>
      <button matButton="outlined" type="button" (click)="ref.close('create')">
        <mat-icon svgIcon="add" />
        {{ t.picker.create }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .search {
      padding: var(--ugm-space-2) var(--ugm-space-6) var(--ugm-space-3);
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: var(--ugm-space-3);
    }
    mat-form-field {
      inline-size: 100%;
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--ugm-space-1);
    }
    .item {
      display: flex;
      align-items: center;
      gap: var(--ugm-space-3);
      inline-size: 100%;
      min-block-size: 3.5rem;
      padding: var(--ugm-space-2) var(--ugm-space-3);
      border: none;
      border-radius: var(--ugm-shape-m);
      background: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface);
      text-align: start;
      cursor: pointer;
      transition: background-color var(--ugm-motion-fast-effects);
    }
    @media (hover: hover) {
      .item:hover {
        background: var(--mat-sys-surface-container-highest);
      }
    }
    .item:active {
      background: var(--mat-sys-secondary-container);
    }
    .text {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-inline-size: 0;
    }
    .name {
      font: var(--ugm-type-body-l);
      font-weight: 500;
    }
    .meta {
      font: var(--ugm-type-body-m);
      color: var(--mat-sys-on-surface-variant);
    }
    .badge {
      font: var(--ugm-type-body-m);
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
    }
    .empty {
      padding: var(--ugm-space-4);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class BuildPickerDialog {
  protected readonly data = inject<PickerData>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<BuildPickerDialog, PickerResult>);
  protected readonly store = inject(AppStore);
  protected readonly i18n = inject(I18n);
  protected readonly iconUrl = iconUrl;

  protected readonly query = signal('');
  protected readonly builds = computed(() =>
    this.store
      .builds()
      .filter((build) => matchesQuery(build, this.query(), this.i18n.profession(build.profession))),
  );
}
