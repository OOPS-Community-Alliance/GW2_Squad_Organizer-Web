import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LIMITS } from '../domain/model';
import { I18n } from '../i18n/i18n';

export interface NameData {
  title: string;
  label: string;
  hint: string;
  action: string;
  value: string;
}

@Component({
  selector: 'app-name-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ data.label }}</mat-label>
          <input
            matInput
            formControlName="name"
            [maxlength]="maxLength"
            autocomplete="off"
            required
          />
          <mat-hint>{{ data.hint }}</mat-hint>
          @if (name.hasError('required')) {
            <mat-error>{{ i18n.t().buildForm.nameRequired }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>{{ i18n.t().common.cancel }}</button>
        <button matButton="filled" type="submit">{{ data.action }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .full {
      inline-size: 100%;
      margin-block-start: var(--ugm-space-2);
    }
  `,
})
export class NameDialog {
  protected readonly data = inject<NameData>(MAT_DIALOG_DATA);
  protected readonly i18n = inject(I18n);
  private readonly ref = inject(MatDialogRef<NameDialog, string>);

  protected readonly maxLength = LIMITS.nameMaxLength;
  protected readonly name = new FormControl(this.data.value, {
    nonNullable: true,
    validators: [Validators.required, (c) => (c.value.trim() ? null : { required: true })],
  });
  /** Ohne Formular-Direktive würde der Browser das Formular nativ absenden und neu laden. */
  protected readonly form = new FormGroup({ name: this.name });

  protected submit(): void {
    this.name.markAsTouched();
    if (this.name.valid) this.ref.close(this.name.value.trim());
  }
}
