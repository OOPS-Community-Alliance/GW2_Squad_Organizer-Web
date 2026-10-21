import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Group, LIMITS } from '../domain/model';
import { countTags } from '../domain/role-tags';
import { I18n } from '../i18n/i18n';
import { Actions } from '../state/actions';
import { AppStore } from '../state/app-store';
import { RoleSettings } from '../state/role-settings';
import { Slot } from './slot';

@Component({
  selector: 'app-group-card',
  imports: [Slot, MatButtonModule, MatIconModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-card.html',
  styleUrl: './group-card.scss',
  host: { '(focusin)': 'onFocusIn($event)' },
})
export class GroupCard {
  protected readonly actions = inject(Actions);
  protected readonly i18n = inject(I18n);
  private readonly store = inject(AppStore);
  private readonly roleSettings = inject(RoleSettings);

  readonly index = input.required<number>();
  readonly group = input.required<Group>();
  readonly groupCount = input.required<number>();

  protected readonly maxSlots = LIMITS.maxSlots;
  protected readonly number = computed(() => this.index() + 1);
  protected readonly occupied = computed(
    () => this.group().slots.filter((id) => id !== null).length,
  );

  /** Roving Tabindex: Pro Gruppe ist genau ein Slot per Tab erreichbar. */
  private readonly lastFocused = signal(0);
  protected readonly tabSlot = computed(() =>
    Math.min(this.lastFocused(), this.group().slots.length - 1),
  );

  protected readonly roles = computed(() => {
    const counts = countTags(this.group().slots, this.store.buildMap());
    const t = this.i18n.t();
    return this.roleSettings.required().map((tag) => {
      const count = counts[tag] ?? 0;
      return {
        tag,
        count,
        missing: count === 0,
        label: count ? t.group.has(t.tags[tag], count) : t.group.missing(t.tags[tag]),
      };
    });
  });

  protected onFocusIn(event: FocusEvent): void {
    const key = (event.target as HTMLElement).dataset?.['slotKey'];
    if (key) this.lastFocused.set(Number(key.split(':')[1]));
  }
}
