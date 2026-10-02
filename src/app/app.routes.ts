import { inject } from '@angular/core';
import { CanMatchFn, Route, Routes } from '@angular/router';
import { DEFAULT_LOCALE, LOCALES, Locale } from './core/i18n/locale';
import { ROUTE_PATHS } from './core/i18n/route-paths';
import { StylesheetService } from './core/platform/stylesheet.service';

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
 * Page dont les règles vivent dans `pages.css`, hors du bundle initial : la
 * page n'est affichée qu'une fois sa feuille appliquée (jamais de flash sans
 * style en navigation), et la feuille est liée dans son HTML pré-rendu.
 */
const styled =
  (load: () => Promise<object>): Route['loadComponent'] =>
  () => {
    const sheet = inject(StylesheetService).load('pages.css');
    return load().then((page) => sheet.then(() => page)) as never;
  };

const reader = () => import('./features/reader/pages/reader-page');

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
  // Le bundle initial n'a que quelques octets de marge : une fabrique évite
  // de répéter les trois clés de chaque route.
  // Toute page autre que le lecteur a ses règles dans `pages.css`.
  const page = (key: keyof typeof ROUTE_PATHS, load: () => Promise<object>): Route => ({
    path: strip(ROUTE_PATHS[key][locale]),
    loadComponent: styled(load),
    data,
  });

  return [
    {
      path: '',
      data,
      children: [
        { path: strip(ROUTE_PATHS.reader[locale]), loadComponent: reader, data },
        page('glossary', () => import('./features/glossary/glossary-page')),
        // Une page par abréviation. Les valeurs de `:slug` à pré-rendre sont
        // dérivées de `GLOSSARY` dans `app.routes.server.ts`.
        {
          path: `${strip(ROUTE_PATHS.glossary[locale])}/:slug`,
          canMatch: [isGlossaryTerm],
          loadComponent: styled(() => import('./features/glossary/pages/term-page')),
          data,
        },
        // Export par défaut : `loadComponent` l'accepte sans `.then`, des octets de moins au bundle initial.
        page('format', () => import('./features/format/format-page')),
        page('converter', () => import('./features/converter/converter-page')),
        page('projects', () => import('./features/reader/pages/projects-page')),
        page('hookSizes', () => import('./features/tools/pages/hook-sizes-page')),
        page('gaugeCalculator', () => import('./features/tools/pages/gauge-calculator-page')),
        page('readForeignPattern', () => import('./features/guides/pages/foreign-pattern-page')),
        page('rowCounter', () => import('./features/tools/pages/row-counter-page')),
        page('guideReadingPattern', () => import('./features/guides/pages/reading-pattern-page')),
        page('guideReadingChart', () => import('./features/guides/pages/reading-chart-page')),
        page(
          'guideCrochetOrKnitting',
          () => import('./features/guides/pages/crochet-or-knitting-page'),
        ),
        page('settings', () => import('./features/settings/settings-page')),
        page('privacy', () => import('./features/legal/pages/privacy-page')),
        page('forDesigners', () => import('./features/designers/pages/for-designers-page')),
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
    loadComponent: styled(() => import('./features/design-system/design-system-page')),
    data: { locale: 'fr' },
  },
  {
    path: '**',
    loadComponent: reader,
    data: { locale: DEFAULT_LOCALE },
  },
];
