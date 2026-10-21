import { ImportError, SquadBundle } from './bundle';
import { Build, LIMITS, sanitizeLink, Squad } from './model';
import { buildsInSquad } from './squad-ops';
import { PROFESSIONS, ROLE_TAGS, SPECIALIZATIONS } from './professions';

/*
 * Teilen-Link: Squad und verwendete Builds stecken komprimiert im URL-Fragment (#s=…).
 * Das Fragment wird nie an einen Server übertragen.
 *
 * Kompaktformat v1:
 *   { v: 1, n: Name, b: [[Name, Klasse-Index, Elite, Rolle, Link, Tag-Bitmaske]], g: [[Build-Index | -1]] }
 */

const VERSION = 1;
/** Schutz gegen absurd lange Links; reale Squads liegen weit darunter. */
const MAX_ENCODED_LENGTH = 30_000;

type CompactBuild = [string, number, string, string, string, number];
interface CompactSquad {
  v: number;
  n: string;
  b: CompactBuild[];
  g: number[][];
}

function tagsToMask(build: Build): number {
  return build.tags.reduce((mask, tag) => mask | (1 << ROLE_TAGS.indexOf(tag)), 0);
}

function maskToTags(mask: number) {
  return ROLE_TAGS.filter((_, index) => mask & (1 << index));
}

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const writer = stream.writable.getWriter();
  // Fehler beim Schreiben (z. B. beschädigte Daten) kommen auch beim Lesen an; hier nur abfangen.
  writer
    .write(bytes as Uint8Array<ArrayBuffer>)
    .then(() => writer.close())
    .catch(() => undefined);

  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (let result = await reader.read(); !result.done; result = await reader.read()) {
    chunks.push(result.value);
  }
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function encodeShare(
  squad: Squad,
  buildMap: ReadonlyMap<number, Build>,
): Promise<string> {
  const used = buildsInSquad(squad, buildMap).map((entry) => entry.build);
  const index = new Map(used.map((build, i) => [build.id, i]));
  const compact: CompactSquad = {
    v: VERSION,
    n: squad.name,
    b: used.map((build) => [
      build.name,
      PROFESSIONS.indexOf(build.profession),
      build.elite,
      build.role,
      build.link,
      tagsToMask(build),
    ]),
    g: squad.groups.map((group) =>
      group.slots.map((id) => (id === null ? -1 : (index.get(id) ?? -1))),
    ),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  return toBase64Url(await transform(bytes, new CompressionStream('deflate-raw')));
}

const str = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function decodeShare(encoded: string, now: string): Promise<SquadBundle> {
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new ImportError('shareInvalid');
  }

  let data: CompactSquad;
  try {
    const bytes = await transform(fromBase64Url(encoded), new DecompressionStream('deflate-raw'));
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ImportError('shareInvalid');
  }

  if (typeof data !== 'object' || data === null) throw new ImportError('shareInvalid');
  if (data.v !== VERSION) throw new ImportError('shareVersion', String(data.v));
  if (!Array.isArray(data.b) || !Array.isArray(data.g)) throw new ImportError('shareInvalid');
  if (data.g.length < 1 || data.g.length > LIMITS.maxGroups) throw new ImportError('groupCount');

  const builds: Build[] = data.b.map((raw, i) => {
    if (!Array.isArray(raw)) throw new ImportError('buildInvalid', i + 1);
    const [name, professionIndex, elite, role, link, mask] = raw;
    const profession = PROFESSIONS[professionIndex as number];
    const cleanName = str(name, LIMITS.nameMaxLength);
    if (!profession || !cleanName) throw new ImportError('buildInvalid', i + 1);
    const cleanElite = str(elite, LIMITS.nameMaxLength);
    return {
      id: i + 1,
      name: cleanName,
      profession,
      elite: SPECIALIZATIONS[profession].includes(cleanElite) ? cleanElite : 'Core',
      role: str(role, LIMITS.roleMaxLength),
      link: sanitizeLink(link),
      tags: Number.isInteger(mask) ? maskToTags(mask as number) : [],
      updatedAt: now,
    };
  });

  const groups = data.g.map((slots, groupIndex) => {
    if (!Array.isArray(slots) || slots.length < 1 || slots.length > LIMITS.maxSlots) {
      throw new ImportError('slotCount', groupIndex + 1);
    }
    return {
      slots: slots.map((value) =>
        Number.isInteger(value) && value >= 0 && value < builds.length
          ? (value as number) + 1
          : null,
      ),
    };
  });

  return { name: str(data.n, LIMITS.nameMaxLength), builds, groups };
}

export const SHARE_PARAM = 's';

export function shareUrl(base: string, encoded: string): string {
  const url = new URL(base);
  url.hash = `${SHARE_PARAM}=${encoded}`;
  return url.href;
}

/** Liest den Teilen-Code aus einem URL-Fragment wie „#s=…“. */
export function readShareFragment(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get(SHARE_PARAM);
}
