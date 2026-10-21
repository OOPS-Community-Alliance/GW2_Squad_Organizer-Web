import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { buildPostText, safeFileName } from '../domain/post';
import { I18n } from '../i18n/i18n';
import { AppStore } from '../state/app-store';
import { Feedback } from '../ui/feedback';
import { copyText, downloadBlob } from '../ui/files';
import { renderSquadImage } from './squad-image';
import { Sharing } from './sharing';

@Component({
  selector: 'app-post-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    TextFieldModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './post-dialog.html',
  styleUrl: './post-dialog.scss',
})
export class PostDialog {
  private readonly store = inject(AppStore);
  private readonly sharing = inject(Sharing);
  private readonly feedback = inject(Feedback);
  protected readonly i18n = inject(I18n);

  protected readonly squad = this.store.activeSquad();
  private readonly t = this.i18n.t().post;

  protected readonly fileName = new FormControl(this.t.fileNameDefault, { nonNullable: true });
  protected readonly text = new FormControl(
    buildPostText(this.squad, this.store.buildMap(), this.t),
    { nonNullable: true },
  );
  protected readonly includeLink = signal(false);
  protected readonly link = signal('');
  protected readonly image = signal<{ blob: Blob; url: string } | null>(null);
  protected readonly canShareFiles = computed(() => {
    const image = this.image();
    if (!image || typeof navigator.canShare !== 'function') return false;
    return navigator.canShare({
      files: [new File([image.blob], 'squad.png', { type: 'image/png' })],
    });
  });

  constructor() {
    void renderSquadImage(this.squad, this.store.buildMap(), this.i18n.t().group.title).then(
      (blob) => this.image.set({ blob, url: URL.createObjectURL(blob) }),
    );
    inject(DestroyRef).onDestroy(() => {
      const image = this.image();
      if (image) URL.revokeObjectURL(image.url);
    });
  }

  protected async toggleLink(checked: boolean): Promise<void> {
    this.includeLink.set(checked);
    if (checked && !this.link()) this.link.set(await this.sharing.link(this.squad));
  }

  private finalText(): string {
    const link = this.includeLink() && this.link();
    return link ? `${this.text.value.trimEnd()}\n\n${this.t.linkLabel}: ${link}` : this.text.value;
  }

  private baseName(): string {
    return safeFileName(this.fileName.value, this.t.fileNameDefault);
  }

  protected async copy(): Promise<void> {
    if (await copyText(this.finalText())) this.feedback.toast(this.t.copied);
  }

  protected saveImage(): void {
    const image = this.image();
    if (!image) return;
    downloadBlob(image.blob, `${this.baseName()}.png`);
    this.feedback.toast(this.t.imageSaved);
  }

  protected saveText(): void {
    downloadBlob(
      new Blob([this.finalText()], { type: 'text/plain;charset=utf-8' }),
      `${this.baseName()}.txt`,
    );
    this.feedback.toast(this.t.textSaved);
  }

  protected async share(): Promise<void> {
    const image = this.image();
    if (!image) return;
    try {
      await navigator.share({
        title: this.squad.name,
        text: this.finalText(),
        files: [new File([image.blob], `${this.baseName()}.png`, { type: 'image/png' })],
      });
    } catch {
      // Abbruch durch Nutzer: nichts zu tun.
    }
  }
}
