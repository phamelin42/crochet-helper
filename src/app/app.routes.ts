import { CanMatchFn, Routes } from '@angular/router';
import { DEFAULT_LOCALE, LOCALES, Locale } from './core/i18n/locale';
import { ROUTE_PATHS } from './core/i18n/route-paths';

/**
 * N'accepte que les abréviations du glossaire ; une autre valeur retombe sur
 * la route `**`. Le glossaire est chargé à la demande : l'importer ici le
 * ferait entrer dans le bundle initial de chaque page du site.
 */
const isGlossaryTerm: CanMatchFn = async (_route, segments) => {
  const { GLOSSARY } = await import('./features/reader/data/glossary');
  const slug = segments.at(-1)?.path;
  return GLOSSARY.some((entry) => entry.slug === slug);
};

/**
 * Un arbre de routes par langue, construit à partir de la même définition.
 *
 * L'anglais vit à la racine, le français sous `/fr` avec des
 * segments traduits (`/fr/glossaire`). Chaque route porte sa langue en `data`,
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
        // Une page par abréviation. Les valeurs de `:slug` à pré-rendre sont
        // dérivées de `GLOSSARY` dans `app.routes.server.ts`.
        {
          path: `${strip(ROUTE_PATHS.glossary[locale])}/:slug`,
          canMatch: [isGlossaryTerm],
          loadComponent: () =>
            import('./features/glossary/pages/term-page').then((m) => m.GlossaryTermPage),
          data,
        },
        {
          path: strip(ROUTE_PATHS.format[locale]),
          loadComponent: () => import('./features/format/format-page').then((m) => m.FormatPage),
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
    loadComponent: () => import('./features/reader/pages/reader-page').then((m) => m.ReaderPage),
    data: { locale: DEFAULT_LOCALE },
  },
];
