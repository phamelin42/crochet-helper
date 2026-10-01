// Liste des applications du workspace (produits et vitrine), lue dans angular.json.
import { readFileSync } from 'node:fs';

export function applications(fichier = 'angular.json') {
  const { projects } = JSON.parse(readFileSync(fichier, 'utf8'));
  return Object.entries(projects)
    .filter(([, p]) => p.projectType === 'application')
    .map(([nom, p]) => ({ nom, racine: p.root, dist: `dist/${nom}/browser` }));
}

/** Les produits seulement : la vitrine n'est ni publiée ni soumise à l'unicité du contenu. */
export function produits(fichier) {
  return applications(fichier).filter((a) => a.nom !== 'vitrine');
}

export function application(nom, fichier) {
  const app = applications(fichier).find((a) => a.nom === nom);
  if (!app) {
    console.error(
      `Application inconnue : ${nom} (${applications(fichier)
        .map((a) => a.nom)
        .join(', ')})`,
    );
    process.exit(1);
  }
  return app;
}
