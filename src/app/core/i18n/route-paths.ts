import { Locale } from './locale';
import paths from './route-paths.json';

/**
 * Segments d'URL par langue. Les chemins sont traduits — `/glossaire` en
 * français, `/en/glossary` en anglais — parce qu'une URL dans la langue de la
 * page pèse dans le référencement et se partage mieux.
 *
 * Le lecteur occupe la racine : c'est ce que les gens viennent faire ici, et
 * une racine indexable vaut mieux qu'une redirection vers une sous-page.
 *
 * La table vit dans `route-paths.json` pour que les outils de build la lisent
 * aussi. Deux listes tenues séparément avaient déjà divergé : le sitemap et la
 * CI décrivaient encore `/lecteur` après son passage à la racine.
 */
export const ROUTE_PATHS = paths satisfies Record<string, Record<Locale, string>>;

export type RouteName = keyof typeof ROUTE_PATHS;
export type LocalizedPath = Record<Locale, string>;
