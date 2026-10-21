import { Build, Group } from './model';

/**
 * Austauschformat zwischen Import-Quellen (JSON-Datei, Teilen-Link) und Store.
 * Die Slot-IDs verweisen auf die IDs in `builds` und werden beim Übernehmen neu vergeben.
 */
export interface SquadBundle {
  name: string;
  builds: Build[];
  groups: Group[];
}

export type ImportErrorCode =
  | 'notJson'
  | 'structure'
  | 'buildInvalid'
  | 'duplicateBuildId'
  | 'groupCount'
  | 'groupIndex'
  | 'slotCount'
  | 'entryGroup'
  | 'entrySlot'
  | 'missingBuild'
  | 'slotTwice'
  | 'shareInvalid'
  | 'shareVersion';

/** Fehler mit Code statt Text, damit die Oberfläche ihn übersetzen kann. */
export class ImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    readonly detail: string | number = '',
  ) {
    super(`${code}${detail === '' ? '' : `: ${detail}`}`);
    this.name = 'ImportError';
  }
}
