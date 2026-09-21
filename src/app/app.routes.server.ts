import { RenderMode, ServerRoute } from '@angular/ssr';
import { LOCALES, localePrefix } from './core/i18n/locale';
import { ROUTE_PATHS } from './core/i18n/route-paths';
import { GLOSSARY } from './features/reader/data/glossary';

/**
 * Tout est pré-rendu. Les pages d'abréviation sont une route paramétrée
 * (`glossary/:slug`) : Angular ne peut pas en deviner les valeurs, on les
 * dérive donc du glossaire — une entrée ajoutée devient une page, sans liste
 * tenue à la main. Ce fichier n'est compilé que pour le serveur : le glossaire
 * n'entre pas ici dans le bundle du navigateur.
 */
export const serverRoutes: ServerRoute[] = [
  ...LOCALES.map((locale): ServerRoute => ({
    path: `${localePrefix(locale)}${ROUTE_PATHS.glossary[locale]}/:slug`.replace(/^\//, ''),
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => GLOSSARY.map((entry) => ({ slug: entry.slug })),
  })),
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
