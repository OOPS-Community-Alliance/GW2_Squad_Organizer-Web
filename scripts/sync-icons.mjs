// Kopiert die benötigten Material-Symbols-SVGs als Literale in den Quellcode.
// Dadurch braucht die App keine Icon-Webfont und funktioniert vollständig offline.
// Aufruf: npm run icons
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const ICONS = [
  'add',
  'arrow_drop_down',
  'check',
  'check_circle',
  'checklist',
  'close',
  'content_copy',
  'contrast',
  'dark_mode',
  'data_object',
  'delete',
  'download',
  'edit',
  'group_add',
  'groups',
  'help',
  'image',
  'info',
  'library_books',
  'light_mode',
  'link',
  'more_vert',
  'open_in_new',
  'person_remove',
  'playlist_add',
  'post_add',
  'redo',
  'remove',
  'restart_alt',
  'search',
  'share',
  'swap_horiz',
  'translate',
  'undo',
  'upload_file',
  'warning',
];

const require = createRequire(import.meta.url);
const root = dirname(require.resolve('@material-symbols/svg-400/package.json'));

const entries = ICONS.map((name) => {
  const svg = readFileSync(join(root, 'outlined', `${name}.svg`), 'utf8')
    .trim()
    .replace(/ width="\d+" height="\d+"/, '');
  return `  ${JSON.stringify(name)}: ${JSON.stringify(svg)},`;
});

const out = `// Generiert von scripts/sync-icons.mjs – nicht von Hand bearbeiten.
// Quelle: @material-symbols/svg-400 (Apache-2.0), Stil „outlined“.
export const UI_ICONS: Record<string, string> = {
${entries.join('\n')}
};
`;

writeFileSync(new URL('../src/app/ui/icons.generated.ts', import.meta.url), out);
console.log(`${ICONS.length} Icons geschrieben.`);
