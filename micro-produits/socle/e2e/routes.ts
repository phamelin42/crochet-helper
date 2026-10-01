import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Playwright se lance depuis la racine du dépôt (playwright.config.ts).
const ROOT = join(process.cwd(), 'dist', 'app', 'browser');

/** Toutes les pages pré-rendues : une page ajoutée entre d'elle-même dans l'audit. */
export function routesPrerendues(dir = ROOT): string[] {
  const routes: string[] = [];
  for (const entree of readdirSync(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) routes.push(...routesPrerendues(chemin));
    else if (entree.name === 'index.html') {
      routes.push(`/${relative(ROOT, dir).split(sep).join('/')}`.replace(/\/$/, '') || '/');
    }
  }
  return routes.sort();
}
