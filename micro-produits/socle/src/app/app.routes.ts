import { Routes } from '@angular/router';

/**
 * Chaque page est paresseuse : le bundle initial ne contient que la coquille.
 * Une page ajoutée ici est pré-rendue, entre au sitemap si elle est
 * indexable et doit être reliée depuis l'en-tête, le pied de page ou une
 * autre page (une page orpheline n'est pas trouvée).
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/outil/pages/outil-page').then((m) => m.OutilPage),
  },
  {
    path: 'mentions-legales',
    loadComponent: () =>
      import('./features/legal/pages/mentions-legales-page').then((m) => m.MentionsLegalesPage),
  },
  {
    path: 'confidentialite',
    loadComponent: () =>
      import('./features/legal/pages/confidentialite-page').then((m) => m.ConfidentialitePage),
  },
  { path: '**', redirectTo: '' },
];
