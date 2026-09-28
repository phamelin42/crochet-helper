/**
 * Chaque symbole de `chart-symbols.ts` a son dessin dans `public/symbols/`, et
 * le dossier ne contient rien d'autre : « aucun symbole inventé » (fiche 35).
 * Une spec Angular n'a pas les types Node, d'où ce contrôle lancé par le build.
 */
import { readFile, readdir } from 'node:fs/promises';

const source = await readFile('src/app/features/reader/data/chart-symbols.ts', 'utf8');
const ids = [...source.matchAll(/\bid: '([a-z0-9-]+)'/g)].map((m) => m[1]);
const files = (await readdir('public/symbols')).filter((f) => f.endsWith('.svg'));
const problems = [];

if (new Set(ids).size !== ids.length) problems.push('identifiants en double dans chart-symbols.ts');
for (const id of ids) {
  if (!files.includes(`${id}.svg`)) {
    problems.push(`${id} : public/symbols/${id}.svg manque`);
    continue;
  }
  const svg = await readFile(`public/symbols/${id}.svg`, 'utf8');
  if (Buffer.byteLength(svg) > 1024) problems.push(`${id}.svg dépasse 1 Ko`);
  if (!/viewBox="0 0 64 64"/.test(svg)) problems.push(`${id}.svg n'est pas en 64 × 64`);
  if (/<(script|image|foreignObject)\b|\son\w+=/i.test(svg)) {
    problems.push(`${id}.svg contient du contenu actif ou une image`);
  }
}
for (const file of files) {
  if (!ids.includes(file.replace(/\.svg$/, '')))
    problems.push(`${file} n'est pas dans chart-symbols.ts`);
}

// Le tableau du guide « lire un diagramme » est dans le HTML pré-rendu des deux
// langues : une page dont le contenu n'apparaît qu'après le JavaScript est un
// bug de référencement (CLAUDE.md, contrainte n° 2).
const paths = JSON.parse(await readFile('src/app/core/i18n/route-paths.json', 'utf8'));
for (const [locale, prefix] of [
  ['en', ''],
  ['fr', '/fr'],
]) {
  const route = `${prefix}${paths.guideReadingChart[locale]}`.replace(/^\//, '');
  let html = '';
  try {
    html = await readFile(`dist/fil-patterns/browser/${route}/index.html`, 'utf8');
  } catch {
    problems.push(`${route} : page pré-rendue absente (lancer après ng build)`);
    continue;
  }
  if (!html.includes('<table')) problems.push(`${route} : pas de tableau des symboles`);
  for (const id of ids) {
    if (!html.includes(`/symbols/${id}.svg`))
      problems.push(`${route} : symbole ${id} absent du HTML`);
  }
}

if (problems.length) {
  console.error(`Symboles de diagramme hors règle :\n${problems.join('\n')}\n`);
  process.exit(1);
}
console.log(`Symboles de diagramme : ${ids.length} identifiants, chacun avec son dessin (≤ 1 Ko).`);
