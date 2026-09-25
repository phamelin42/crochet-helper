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
        {
          path: strip(ROUTE_PATHS.converter[locale]),
          loadComponent: () =>
            import('./features/converter/converter-page').then((m) => m.ConverterPage),
          data,
        },
        {
          path: strip(ROUTE_PATHS.projects[locale]),
          loadComponent: () =>
            import('./features/reader/pages/projects-page').then((m) => m.ProjectsPage),
          data,
        },
        {
          path: strip(ROUTE_PATHS.guideReadingPattern[locale]),
          loadComponent: () =>
            import('./features/guides/pages/reading-pattern-page').then(
              (m) => m.ReadingPatternPage,
            ),
          data,
        },
        {
          path: strip(ROUTE_PATHS.guideReadingChart[locale]),
          loadComponent: () =>
            import('./features/guides/pages/reading-chart-page').then((m) => m.ReadingChartPage),
          data,
        },
        {
          path: strip(ROUTE_PATHS.guideCrochetOrKnitting[locale]),
          loadComponent: () =>
            import('./features/guides/pages/crochet-or-knitting-page').then(
              (m) => m.CrochetOrKnittingPage,
            ),
          data,
        },
        {
          path: strip(ROUTE_PATHS.forDesigners[locale]),
          loadComponent: () =>
            import('./features/designers/pages/for-designers-page').then((m) => m.ForDesignersPage),
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
  // Page d'équipe, sans version anglaise : déclarée ici plutôt que dans
  // `route-paths.json`, qui ne décrit que des paires de langues.
  {
    path: 'design-system',
    loadComponent: () =>
      import('./features/design-system/design-system-page').then((m) => m.DesignSystemPage),
    data: { locale: 'fr' },
  },
  {
    path: '**',
    loadComponent: () => import('./features/reader/pages/reader-page').then((m) => m.ReaderPage),
    data: { locale: DEFAULT_LOCALE },
  },
];
