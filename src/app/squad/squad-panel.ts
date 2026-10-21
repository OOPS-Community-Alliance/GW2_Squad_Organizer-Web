import { ChangeDetectionStrategy, Component, computed, ElementRef, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LIMITS } from '../domain/model';
import { occupiedCount, slotCount } from '../domain/squad-ops';
import { I18n } from '../i18n/i18n';
import { Actions } from '../state/actions';
import { AppStore } from '../state/app-store';
import { SelectionState } from '../state/selection';
import { GroupCard } from './group-card';

@Component({
  selector: 'app-squad-panel',
  imports: [GroupCard, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './squad-panel.html',
  styleUrl: './squad-panel.scss',
})
export class SquadPanel {
  protected readonly store = inject(AppStore);
  protected readonly actions = inject(Actions);
  protected readonly i18n = inject(I18n);
  private readonly selection = inject(SelectionState);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly squad = this.store.activeSquad;
  protected readonly maxGroups = LIMITS.maxGroups;
  protected readonly occupied = computed(() => occupiedCount(this.squad()));
  protected readonly slots = computed(() => slotCount(this.squad()));
  protected readonly overCap = computed(() => this.occupied() > LIMITS.squadCap);
  protected readonly cap = LIMITS.squadCap;

  /** Pfeiltasten: links/rechts innerhalb der Gruppe, hoch/runter zur Nachbargruppe. */
  protected onKeydown(event: KeyboardEvent): void {
    const key = (event.target as HTMLElement).dataset?.['slotKey'];
    if (!key) return;
    const [group, slot] = key.split(':').map(Number);
    const groups = this.squad().groups;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.actions.clearSlot({ group, slot });
      return;
    }

    let target: [number, number] | null = null;
    switch (event.key) {
      case 'ArrowRight':
        target =
          slot + 1 < groups[group].slots.length
            ? [group, slot + 1]
            : group + 1 < groups.length
              ? [group + 1, 0]
              : null;
        break;
      case 'ArrowLeft':
        target =
          slot > 0
            ? [group, slot - 1]
            : group > 0
              ? [group - 1, groups[group - 1].slots.length - 1]
              : null;
        break;
      case 'ArrowDown':
        target =
          group + 1 < groups.length
            ? [group + 1, Math.min(slot, groups[group + 1].slots.length - 1)]
            : null;
        break;
      case 'ArrowUp':
        target = group > 0 ? [group - 1, Math.min(slot, groups[group - 1].slots.length - 1)] : null;
        break;
      case 'Home':
        target = [group, 0];
        break;
      case 'End':
        target = [group, groups[group].slots.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (target) {
      this.host.nativeElement
        .querySelector<HTMLElement>(`[data-slot-key="${target[0]}:${target[1]}"]`)
        ?.focus();
    }
  }

  protected onEscape(): void {
    this.selection.clear();
  }
}
