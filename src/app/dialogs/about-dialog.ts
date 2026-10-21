import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { I18n } from '../i18n/i18n';
import { APP_VERSION } from '../version';

@Component({
  selector: 'app-about-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = i18n.t().about;
    <h2 mat-dialog-title>{{ t.title }}</h2>
    <mat-dialog-content>
      <p>{{ t.text }}</p>
      <h3>{{ t.shortcuts }}</h3>
      <dl class="keys">
        @for (entry of t.keys; track entry[0]) {
          <div>
            <dt>
              <kbd>{{ entry[0] }}</kbd>
            </dt>
            <dd>{{ entry[1] }}</dd>
          </div>
        }
      </dl>
      <h3>{{ t.dragTitle }}</h3>
      <p>{{ t.drag }}</p>
      <p class="small">
        {{ t.original }}
        <a
          href="https://github.com/Kell-Kaychup/GW2_Squad_Organizer"
          target="_blank"
          rel="noopener noreferrer"
          >github.com/Kell-Kaychup/GW2_Squad_Organizer</a
        >
      </p>
      <p class="small">{{ t.legal }}</p>
      <p class="small">{{ t.version(version) }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton="filled" type="button" mat-dialog-close>{{ i18n.t().common.close }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    h3 {
      font: var(--ugm-type-title-m);
      margin: var(--ugm-space-4) 0 var(--ugm-space-2);
    }
    .keys {
      display: grid;
      gap: var(--ugm-space-2);
      margin: 0;
    }
    .keys div {
      display: grid;
      grid-template-columns: minmax(9rem, auto) 1fr;
      gap: var(--ugm-space-3);
      align-items: baseline;
    }
    dd {
      margin: 0;
    }
    kbd {
      font: var(--ugm-type-label-l);
      padding: 0.125rem var(--ugm-space-2);
      border-radius: var(--ugm-shape-xs);
      background: var(--mat-sys-surface-container-highest);
      white-space: nowrap;
    }
    .small {
      font: var(--ugm-type-body-m);
      color: var(--mat-sys-on-surface-variant);
    }
    a {
      color: var(--mat-sys-primary);
      overflow-wrap: anywhere;
    }
  `,
})
export class AboutDialog {
  protected readonly i18n = inject(I18n);
  protected readonly version = APP_VERSION;
}
