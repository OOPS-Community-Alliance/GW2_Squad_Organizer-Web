import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { iconUrl, Profession, PROFESSIONS } from '../domain/professions';
import { I18n } from '../i18n/i18n';
import { Actions } from '../state/actions';
import { AppStore } from '../state/app-store';
import { Layout } from '../state/layout';
import { BuildCard } from './build-card';
import { matchesQuery } from './library-filter';

@Component({
  selector: 'app-library-panel',
  imports: [
    BuildCard,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './library-panel.html',
  styleUrl: './library-panel.scss',
})
export class LibraryPanel {
  protected readonly store = inject(AppStore);
  protected readonly actions = inject(Actions);
  protected readonly i18n = inject(I18n);
  protected readonly layout = inject(Layout);
  protected readonly iconUrl = iconUrl;

  protected readonly query = signal('');
  protected readonly profession = signal<Profession | 'all'>('all');

  /** Nur Klassen anbieten, für die es Builds gibt. */
  protected readonly professions = computed(() => {
    const used = new Set(this.store.builds().map((build) => build.profession));
    return PROFESSIONS.filter((profession) => used.has(profession));
  });

  protected readonly filtered = computed(() => {
    const profession = this.profession();
    return this.store
      .builds()
      .filter(
        (build) =>
          (profession === 'all' || build.profession === profession) &&
          matchesQuery(build, this.query(), this.i18n.profession(build.profession)),
      );
  });

  protected readonly filterActive = computed(
    () => this.query().trim() !== '' || this.profession() !== 'all',
  );

  protected resetFilter(): void {
    this.query.set('');
    this.profession.set('all');
  }
}
