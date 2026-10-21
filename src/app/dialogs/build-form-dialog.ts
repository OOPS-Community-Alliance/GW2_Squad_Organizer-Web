import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Build, BuildInput, LIMITS, sanitizeLink } from '../domain/model';
import {
  iconUrl,
  Profession,
  PROFESSIONS,
  ROLE_TAGS,
  RoleTag,
  SPECIALIZATIONS,
} from '../domain/professions';
import { inferTags } from '../domain/role-tags';
import { I18n } from '../i18n/i18n';
import { AppStore } from '../state/app-store';

export interface BuildFormData {
  build?: Build;
}

const ROLE_SUGGESTIONS = [
  'Heal',
  'Support',
  'Boonstrip',
  'Stab',
  'Quickness',
  'Alacrity',
  'DPS',
  'Tank',
];

function linkValidator(control: AbstractControl<string>) {
  const value = control.value.trim();
  return !value || sanitizeLink(value) ? null : { link: true };
}

@Component({
  selector: 'app-build-form-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './build-form-dialog.html',
  styleUrl: './build-form-dialog.scss',
})
export class BuildFormDialog {
  private readonly data = inject<BuildFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<BuildFormDialog, BuildInput>);
  private readonly store = inject(AppStore);
  protected readonly i18n = inject(I18n);

  protected readonly editing = !!this.data.build;
  protected readonly professions = PROFESSIONS;
  protected readonly roleTags = ROLE_TAGS;
  protected readonly limits = LIMITS;
  protected readonly iconUrl = iconUrl;

  protected readonly form = new FormGroup({
    profession: new FormControl<Profession>(this.data.build?.profession ?? 'Guardian', {
      nonNullable: true,
    }),
    elite: new FormControl(this.data.build?.elite ?? 'Core', { nonNullable: true }),
    name: new FormControl(this.data.build?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, (c) => (c.value.trim() ? null : { required: true })],
    }),
    role: new FormControl(this.data.build?.role ?? '', { nonNullable: true }),
    tags: new FormControl<RoleTag[]>(this.data.build?.tags ?? [], { nonNullable: true }),
    link: new FormControl(this.data.build?.link ?? '', {
      nonNullable: true,
      validators: [linkValidator],
    }),
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** Tags werden aus der Rolle vorgeschlagen, bis jemand sie selbst ändert. */
  private tagsTouched = (this.data.build?.tags.length ?? 0) > 0;

  protected readonly specs = computed(() => SPECIALIZATIONS[this.value().profession ?? 'Guardian']);
  protected readonly preview = computed(() => {
    const { profession = 'Guardian', elite = 'Core' } = this.value();
    return { icon: iconUrl(profession, elite), label: this.i18n.specLabel(profession, elite) };
  });

  private readonly roleQuery = signal(this.form.controls.role.value);
  protected readonly roleOptions = computed(() => {
    const query = this.roleQuery().trim().toLowerCase();
    const known = new Set([
      ...ROLE_SUGGESTIONS,
      ...this.store
        .builds()
        .map((b) => b.role.trim())
        .filter(Boolean),
    ]);
    return [...known]
      .filter((role) => role.toLowerCase().includes(query) && role.toLowerCase() !== query)
      .slice(0, 8);
  });

  constructor() {
    const { profession, elite, name, role, tags } = this.form.controls;
    profession.valueChanges.subscribe((value) => {
      if (!SPECIALIZATIONS[value].includes(elite.value)) elite.setValue('Core');
    });
    role.valueChanges.subscribe((value) => this.roleQuery.set(value));
    for (const control of [profession, elite, name, role]) {
      control.valueChanges.subscribe(() => this.suggestTags());
    }
    tags.valueChanges.subscribe(() => (this.tagsTouched = true));
    if (!this.tagsTouched) this.suggestTags();
  }

  private suggestTags(): void {
    if (this.tagsTouched) return;
    const { profession, elite, name, role } = this.form.getRawValue();
    this.form.controls.tags.setValue(inferTags({ profession, elite, name, role }), {
      emitEvent: false,
    });
    this.tagsTouched = false;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.ref.close({ ...value, link: sanitizeLink(value.link) });
  }
}
