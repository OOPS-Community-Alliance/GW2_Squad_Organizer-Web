import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { linkHost } from '../domain/model';
import { iconUrl } from '../domain/professions';
import { I18n } from '../i18n/i18n';
import { Actions } from '../state/actions';
import { Layout } from '../state/layout';
import { SelectionState } from '../state/selection';

/** Details und Aktionen zur aktuellen Auswahl (entspricht der Detailleiste des Originals). */
@Component({
  selector: 'app-selection-bar',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './selection-bar.html',
  styleUrl: './selection-bar.scss',
})
export class SelectionBar {
  protected readonly selection = inject(SelectionState);
  protected readonly actions = inject(Actions);
  protected readonly layout = inject(Layout);
  protected readonly i18n = inject(I18n);

  protected readonly build = this.selection.build;
  protected readonly slot = this.selection.slot;
  protected readonly icon = computed(() => {
    const build = this.build();
    return build ? iconUrl(build.profession, build.elite) : null;
  });
  protected readonly host = computed(() => linkHost(this.build()?.link ?? ''));
  protected readonly hint = computed(() => {
    const build = this.build();
    if (!build) return '';
    const t = this.i18n.t().selection;
    return this.slot() ? t.moveHint(build.name) : t.placeHint(build.name);
  });
  /** In der Bibliothek auf schmalen Bildschirmen: Zum Platzieren in den Squad wechseln. */
  protected readonly showPlaceInSquad = computed(
    () => this.layout.isCompact() && this.layout.view() !== 'squad' && !this.slot(),
  );
}
