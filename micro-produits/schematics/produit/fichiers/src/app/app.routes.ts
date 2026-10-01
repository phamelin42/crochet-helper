import { Routes } from '@angular/router';

/**
 * Chaque page est paresseuse : le bundle initial ne contient que la coquille.
 * Une page ajoutée est pré-rendue, entre au sitemap si elle est indexable, et
 * doit être reliée depuis une autre page.
 */
export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/accueil-page').then((m) => m.AccueilPage) },
  { path: 'aide', loadComponent: () => import('./pages/aide-page').then((m) => m.AidePage) },
  {
    path: 'mentions-legales',
    loadComponent: () => import('@mp/ui/legal').then((m) => m.MentionsLegalesPage),
  },
  {
    path: 'confidentialite',
    loadComponent: () => import('@mp/ui/legal').then((m) => m.ConfidentialitePage),
  },
  { path: '**', redirectTo: '' },
];
