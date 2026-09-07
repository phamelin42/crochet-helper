import { Routes } from '@angular/router';
import { DEFAULT_LOCALE, LOCALES, Locale } from './core/i18n/locale';
import { ROUTE_PATHS } from './core/i18n/route-paths';

/**
 * Un arbre de routes par langue, construit à partir de la même définition.
 *
 * Le français vit à la racine (`/lecteur`), l'anglais sous `/en` avec des
 * segments traduits (`/en/reader`). Chaque route porte sa langue en `data`,
 * ce que les pages lisent pour se traduire et poser leurs métadonnées — la
 * langue vient donc de l'URL, jamais d'une préférence stockée, et les deux
 * versions sont pré-rendues et indexables séparément.
 */
function routesFor(locale: Locale): Routes {
  const strip = (path: string) => path.replace(/^\//, '');
  const data = { locale };

  return [
    {
      path: '',
      data,
      children: [
        {
          path: '',
          loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
          data,
        },
        {
          path: strip(ROUTE_PATHS.reader[locale]),
          loadComponent: () =>
            import('./features/reader/pages/reader-page').then((m) => m.ReaderPage),
          data,
        },
        {
          path: strip(ROUTE_PATHS.glossary[locale]),
          loadComponent: () =>
            import('./features/glossary/glossary-page').then((m) => m.GlossaryPage),
          data,
        },
      ],
    },
  ];
}

export const routes: Routes = [
  ...LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).flatMap((locale) =>
    routesFor(locale).map((route) => ({ ...route, path: locale })),
  ),
  ...routesFor(DEFAULT_LOCALE),
  {
    path: '**',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
    data: { locale: DEFAULT_LOCALE },
  },
];
