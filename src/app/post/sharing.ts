import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Squad } from '../domain/model';
import { decodeShare, encodeShare, readShareFragment, shareUrl } from '../domain/share-codec';
import { SquadBundle } from '../domain/bundle';
import { AppStore } from '../state/app-store';

/** Ab dieser Länge passt der Link nicht mehr sicher in eine Discord-Nachricht (2.000 Zeichen). */
export const DISCORD_SAFE_LENGTH = 1800;

@Injectable({ providedIn: 'root' })
export class Sharing {
  private readonly doc = inject(DOCUMENT);
  private readonly store = inject(AppStore);

  /** Basis-URL der App ohne Fragment, passend zu GitHub Pages im Unterordner. */
  private baseUrl(): string {
    const url = new URL(this.doc.baseURI);
    url.hash = '';
    url.search = '';
    return url.href;
  }

  async link(squad: Squad = this.store.activeSquad()): Promise<string> {
    return shareUrl(this.baseUrl(), await encodeShare(squad, this.store.buildMap()));
  }

  /** Liest einen geteilten Squad aus der aktuellen Adresse, falls vorhanden. */
  async readFromLocation(): Promise<SquadBundle | null> {
    const code = readShareFragment(this.doc.location.hash);
    return code ? decodeShare(code, new Date().toISOString()) : null;
  }

  /** Entfernt den Teilen-Code aus der Adresszeile, damit ein Neuladen ihn nicht erneut anbietet. */
  clearLocation(): void {
    const { pathname, search } = this.doc.location;
    this.doc.defaultView?.history.replaceState(null, '', pathname + search);
  }
}
