/**
 * Fait respecter la règle 5 de CLAUDE.md sans relecture humaine : aucun style
 * local dans les composants de fonctionnalité (\`styles:\` ou \`style="…"\`), et
 * aucune couleur brute hors de \`tokens.css\`. Trois fiches d'affilée l'avaient
 * enfreinte ; ce contrôle rend le piège gratuit à détecter.
 *
 * \`shared/\` n'est pas concerné : ses composants habillent le design system.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const problems = [];

for await (const file of walk('src/app/features')) {
  if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue;
  const lines = (await readFile(file, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    if (/^\s*styles:\s*[`\[]/.test(line)) problems.push(`${file}:${i + 1} — \`styles:\` local`);
    if (/\sstyle="/.test(line)) problems.push(`${file}:${i + 1} — attribut style="…"`);
  });
}

for await (const file of walk('src/styles')) {
  if (!file.endsWith('.css') || file.endsWith('tokens.css')) continue;
  const lines = (await readFile(file, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    if (/#[0-9a-f]{3,8}\b/i.test(line.replace(/\/\*.*?\*\//g, ''))) {
      problems.push(`${file}:${i + 1} — couleur brute, utiliser un jeton de tokens.css`);
    }
  });
}

if (problems.length) {
  console.error(`Styles hors règle (CLAUDE.md, règle 5) :\n${problems.join('\n')}\n`);
  process.exit(1);
}
console.log('Styles : aucun style local dans features/, aucune couleur brute hors tokens.css.');
