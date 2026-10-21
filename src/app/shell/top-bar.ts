import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { I18n, LANGS } from '../i18n/i18n';
import { Actions } from '../state/actions';
import { AppStore } from '../state/app-store';
import { Dialogs } from '../dialogs/dialogs';
import { Layout, ThemeMode } from '../state/layout';

@Component({
  selector: 'app-top-bar',
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
})
export class TopBar {
  protected readonly store = inject(AppStore);
  protected readonly actions = inject(Actions);
  protected readonly layout = inject(Layout);
  protected readonly dialogs = inject(Dialogs);
  protected readonly i18n = inject(I18n);

  protected readonly langs = LANGS;
  protected readonly themes: { mode: ThemeMode; icon: string }[] = [
    { mode: 'system', icon: 'contrast' },
    { mode: 'light', icon: 'light_mode' },
    { mode: 'dark', icon: 'dark_mode' },
  ];

  protected themeLabel(mode: ThemeMode): string {
    const t = this.i18n.t().top;
    return mode === 'system' ? t.themeSystem : mode === 'light' ? t.themeLight : t.themeDark;
  }
}
