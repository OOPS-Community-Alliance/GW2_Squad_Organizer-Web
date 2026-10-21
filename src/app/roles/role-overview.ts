import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ROLE_TAGS, RoleTag, tagIconUrl } from '../domain/professions';
import { roleOverview } from '../domain/role-tags';
import { I18n } from '../i18n/i18n';
import { AppStore } from '../state/app-store';
import { Layout } from '../state/layout';
import { RoleSettings } from '../state/role-settings';

@Component({
  selector: 'app-role-overview',
  imports: [MatChipsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-overview.html',
  styleUrl: './role-overview.scss',
})
export class RoleOverview {
  private readonly store = inject(AppStore);
  protected readonly settings = inject(RoleSettings);
  protected readonly i18n = inject(I18n);
  protected readonly layout = inject(Layout);
  protected readonly allTags = ROLE_TAGS;
  protected readonly tagIcon = tagIconUrl;

  protected readonly overview = computed(() =>
    roleOverview(this.store.activeSquad(), this.store.buildMap(), this.settings.required()),
  );

  protected readonly gaps = computed(() =>
    this.overview().groups.reduce((sum, group) => sum + group.missing.length, 0),
  );

  /** Gesamtzählung: alle vorhandenen und alle geprüften Aufgaben. */
  protected readonly totals = computed(() => {
    const { totals } = this.overview();
    const required = new Set(this.settings.required());
    return ROLE_TAGS.filter((tag) => totals[tag] || required.has(tag)).map((tag) => ({
      tag,
      count: totals[tag] ?? 0,
    }));
  });

  protected setRequired(value: RoleTag[] | RoleTag | null): void {
    this.settings.set(Array.isArray(value) ? value : value ? [value] : []);
  }
}
