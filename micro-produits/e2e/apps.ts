import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface AppTestee {
  nom: string;
  dist: string;
  port: number;
}

/**
 * Applications construites, chacune sur son port. Playwright se lance depuis
 * la racine du workspace ; une application ajoutée (schematic) entre d'elle-
 * même dans l'audit dès qu'elle est construite.
 */
export function appsConstruites(): AppTestee[] {
  const { projects } = JSON.parse(readFileSync('angular.json', 'utf8'));
  return Object.entries<{ projectType: string }>(projects)
    .filter(([, p]) => p.projectType === 'application')
    .map(([nom], i) => ({ nom, dist: join('dist', nom, 'browser'), port: 4310 + i }))
    .filter((a) => existsSync(a.dist));
}

/** Toutes les pages pré-rendues d'une application. */
export function routesPrerendues(racine: string, dir = racine): string[] {
  const routes: string[] = [];
  for (const entree of readdirSync(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) routes.push(...routesPrerendues(racine, chemin));
    else if (entree.name === 'index.html') {
      routes.push(`/${relative(racine, dir).split(sep).join('/')}`.replace(/\/$/, '') || '/');
    }
  }
  return routes.sort();
}
