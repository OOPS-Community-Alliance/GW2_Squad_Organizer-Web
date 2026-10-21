import { Build, Squad } from '../domain/model';
import { iconUrl } from '../domain/professions';

/*
 * Squad-Aufstellung als PNG (wie das Bild aus create_post() im Original).
 * Canvas kennt keine CSS-Variablen; die Farben entsprechen der Desktop-App,
 * damit das Bild in Discord auf dunklem Hintergrund gut lesbar ist.
 */
const PALETTE = {
  background: '#202630',
  group: '#2b3441',
  slot: '#354252',
  empty: '#73869a',
  text: '#ffffff',
  muted: '#aebdce',
};

const SCALE = 2;
const PAD = 20;
const CELL = 72;
const ICON = 44;
const GAP = 8;
const GROUP_PAD = 12;
const TITLE_H = 36;
const LABEL_H = 22;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

export async function renderSquadImage(
  squad: Squad,
  buildMap: ReadonlyMap<number, Build>,
  groupLabel: (n: number) => string,
): Promise<Blob> {
  const maxSlots = Math.max(...squad.groups.map((group) => group.slots.length));
  const groupWidth = maxSlots * CELL + (maxSlots - 1) * GAP + GROUP_PAD * 2;
  const groupHeight = LABEL_H + CELL + GROUP_PAD * 2;
  const width = PAD * 2 + groupWidth;
  const height = PAD * 2 + TITLE_H + squad.groups.length * (groupHeight + GAP);

  const urls = new Set<string>();
  for (const group of squad.groups) {
    for (const id of group.slots) {
      const build = id === null ? undefined : buildMap.get(id);
      const url = build && iconUrl(build.profession, build.elite);
      if (url) urls.add(url);
    }
  }
  const images = new Map(
    await Promise.all([...urls].map(async (url) => [url, await loadImage(url)] as const)),
  );

  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 20px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillText(ellipsize(ctx, squad.name, width - PAD * 2), PAD, PAD);

  let y = PAD + TITLE_H;
  squad.groups.forEach((group, groupIndex) => {
    ctx.fillStyle = PALETTE.group;
    ctx.beginPath();
    ctx.roundRect(PAD, y, groupWidth, groupHeight, 12);
    ctx.fill();

    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(groupLabel(groupIndex + 1), PAD + GROUP_PAD, y + GROUP_PAD);

    const top = y + GROUP_PAD + LABEL_H;
    group.slots.forEach((id, slotIndex) => {
      const x = PAD + GROUP_PAD + slotIndex * (CELL + GAP);
      ctx.fillStyle = PALETTE.slot;
      ctx.beginPath();
      ctx.roundRect(x, top, CELL, CELL, 8);
      ctx.fill();

      const build = id === null ? undefined : buildMap.get(id);
      if (!build) {
        ctx.fillStyle = PALETTE.empty;
        ctx.beginPath();
        ctx.arc(x + CELL / 2, top + CELL / 2, 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      const url = iconUrl(build.profession, build.elite);
      const img = url ? images.get(url) : null;
      if (img) ctx.drawImage(img, x + (CELL - ICON) / 2, top + 6, ICON, ICON);

      ctx.fillStyle = PALETTE.muted;
      ctx.font = `500 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(ellipsize(ctx, build.name, CELL - 6), x + CELL / 2, top + ICON + 10);
      ctx.textAlign = 'start';
    });

    y += groupHeight + GAP;
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png',
    ),
  );
}
