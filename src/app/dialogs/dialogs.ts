import { ComponentType } from '@angular/cdk/portal';
import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SquadBundle } from '../domain/bundle';
import { Build, BuildInput, SlotRef } from '../domain/model';
import { Layout } from '../state/layout';
import type { PickerResult } from './build-picker-dialog';
import { ConfirmData, ConfirmDialog } from './confirm-dialog';
import type { NameData } from './name-dialog';

/**
 * Öffnet alle Dialoge mit einheitlicher Konfiguration. Auf schmalen Bildschirmen
 * docken sie unten an (in Daumenreichweite) und nutzen die volle Breite.
 * Bis auf die Bestätigung werden Dialoge erst bei Bedarf geladen (kleineres Start-Bundle).
 */
@Injectable({ providedIn: 'root' })
export class Dialogs {
  private readonly dialog = inject(MatDialog);
  private readonly layout = inject(Layout);

  private open<C, D, R>(
    component: ComponentType<C>,
    data: D,
    config: MatDialogConfig<D> = {},
  ): Promise<R | undefined> {
    const compact = this.layout.isCompact();
    const ref = this.dialog.open<C, D, R>(component, {
      data,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      width: compact ? '100vw' : (config.width ?? '560px'),
      maxWidth: compact ? '100vw' : '92vw',
      maxHeight: compact ? '92dvh' : '90dvh',
      position: compact ? { bottom: '0' } : undefined,
      panelClass: compact ? 'sheet-dialog' : undefined,
      ...config,
    });
    return firstValueFrom(ref.afterClosed());
  }

  async confirm(data: ConfirmData): Promise<boolean> {
    const result = await this.open<ConfirmDialog, ConfirmData, boolean>(ConfirmDialog, data, {
      role: 'alertdialog',
      width: '440px',
    });
    return result === true;
  }

  async askName(data: NameData): Promise<string | undefined> {
    const { NameDialog } = await import('./name-dialog');
    return this.open<unknown, NameData, string>(NameDialog, data, { width: '440px' });
  }

  async buildForm(build?: Build): Promise<BuildInput | undefined> {
    const { BuildFormDialog } = await import('./build-form-dialog');
    return this.open<unknown, { build?: Build }, BuildInput>(BuildFormDialog, { build });
  }

  async pickBuild(ref: SlotRef): Promise<PickerResult | undefined> {
    const { BuildPickerDialog } = await import('./build-picker-dialog');
    return this.open<unknown, { ref: SlotRef }, PickerResult>(BuildPickerDialog, { ref });
  }

  async post(): Promise<void> {
    const { PostDialog } = await import('../post/post-dialog');
    return this.open<unknown, null, void>(PostDialog, null, { width: '720px' });
  }

  async shareImport(bundle: SquadBundle): Promise<boolean> {
    const { ShareImportDialog } = await import('./share-import-dialog');
    return (await this.open<unknown, SquadBundle, boolean>(ShareImportDialog, bundle)) === true;
  }

  async about(): Promise<void> {
    const { AboutDialog } = await import('./about-dialog');
    return this.open<unknown, null, void>(AboutDialog, null);
  }
}
