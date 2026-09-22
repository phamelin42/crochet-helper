/**
 * Vérifie que la vitrine du design system montre bien chaque composant de
 * `shared/ui/`.
 *
 * Pourquoi un script de build plutôt qu'un test : les tests Angular n'ont pas
 * accès au système de fichiers (pas de types Node dans `tsconfig.spec.json`),
 * et la liste doit être lue depuis les fichiers pour rester juste. Le premier
 * critère de la fiche 08 se vérifiait à l'œil : il se serait périmé au premier
 * composant ajouté.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const UI_DIR = 'src/app/shared/ui';
const SHOWCASE = 'src/app/features/design-system/design-system-page.ts';

// `fil-tooltip-host` est rendu une fois pour toute l'application (`app.ts`) :
// la vitrine s'en sert sans le déclarer, et c'est correct.
const showcase = (await readFile(SHOWCASE, 'utf8')) + (await readFile('src/app/app.ts', 'utf8'));
const entries = await readdir(UI_DIR, { recursive: true, withFileTypes: true });
const missing = [];
let checked = 0;

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts')) continue;
  const source = await readFile(join(entry.parentPath ?? entry.path, entry.name), 'utf8');
  if (!/@(Component|Directive)\(/.test(source)) continue;
  for (const [, selector] of source.matchAll(/selector: '([^']+)'/g)) {
    // « button[filButton], a[filButton] » → on cherche la balise ou l'attribut,
    // en exigeant une frontière : `fil-checkbox-autre` ne compte pas pour
    // `fil-checkbox`.
    const patterns = selector.split(',').map((part) => {
      const attribute = part.match(/\[([^\]]+)\]/);
      return attribute
        ? new RegExp(`[\\s[]${attribute[1]}(?=[\\s\\]="'>])`)
        : new RegExp(`<${part.trim()}(?=[\\s/>])`);
    });
    checked++;
    if (!patterns.some((pattern) => pattern.test(showcase))) missing.push(selector);
  }
}

if (missing.length) {
  console.error(
    `Vitrine du design system incomplète — composants absents de ${SHOWCASE} :\n` +
      missing.join('\n') +
      '\n',
  );
  process.exit(1);
}
console.log(`Vitrine : ${checked} composant(s) de shared/ui présent(s).`);
