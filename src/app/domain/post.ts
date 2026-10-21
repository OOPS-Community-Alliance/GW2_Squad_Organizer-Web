import { Build, Squad } from './model';
import { buildsInSquad } from './squad-ops';

export interface PostTexts {
  intro: string;
  outro: string;
  countLabel: string;
  linkLabel: string;
}

/**
 * Beitragstext wie create_post() im Original: jeder Build einmal, mit Anzahl.
 * Das Format „[Text](URL)“ rendert Discord als Link.
 */
export function buildPostText(
  squad: Squad,
  buildMap: ReadonlyMap<number, Build>,
  texts: PostTexts,
  shareLink?: string,
): string {
  const lines = buildsInSquad(squad, buildMap).map(({ build, count }) => {
    const role = build.role.trim();
    const label = `${build.name}${role ? ` : ${role}` : ''} (${texts.countLabel}: ${count})`;
    return build.link ? `[${label}](${build.link})` : `[${label}]`;
  });

  const parts = [texts.intro, lines.join('\n'), texts.outro];
  if (shareLink) parts.push(`${texts.linkLabel}: ${shareLink}`);
  return parts.filter((part) => part.trim() !== '').join('\n\n');
}

/** Erlaubte Zeichen für Dateinamen, wie save_post() im Original. */
export function safeFileName(name: string, fallback: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N}_\- ]/gu, '').trim();
  return cleaned || fallback;
}
