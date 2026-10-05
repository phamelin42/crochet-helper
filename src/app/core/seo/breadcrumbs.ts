import { Locale, localePrefix } from '../i18n/locale';
import { ROUTE_PATHS } from '../i18n/route-paths';

/** Libellés communs du fil d'Ariane. Hors `translations.ts` : seules des pages paresseuses s'en servent. */
export const CRUMBS: Record<
  Locale,
  { readonly label: string; readonly home: string; readonly glossary: string }
> = {
  fr: { label: 'Fil d’Ariane', home: 'Accueil', glossary: 'Glossaire' },
  en: { label: 'Breadcrumb', home: 'Home', glossary: 'Glossary' },
};

/** Les deux premiers niveaux de toute page de contenu : l'accueil, puis la page elle-même. */
export function homeCrumb(locale: Locale): { label: string; href: string } {
  return { label: CRUMBS[locale].home, href: localePrefix(locale) || '/' };
}

export function glossaryCrumb(locale: Locale): { label: string; href: string } {
  return {
    label: CRUMBS[locale].glossary,
    href: `${localePrefix(locale)}${ROUTE_PATHS.glossary[locale]}`,
  };
}

/**
 * `BreadcrumbList` schema.org des mêmes niveaux que le fil visible
 * (`shared/ui/breadcrumb`), en URL absolues.
 */
export function breadcrumbList(
  origin: string,
  items: readonly { readonly label: string; readonly href: string }[],
): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${origin}${item.href}`,
    })),
  };
}
