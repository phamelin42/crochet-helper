import { LOCALES, Locale } from '../i18n/locale';

/**
 * Première langue du site dans les préférences du navigateur (« fr-FR, en »
 * → `fr`), ou `null` côté serveur et pour une langue que le site ne sert pas.
 *
 * Elle ne choisit jamais la langue de la page, qui vient de l'URL (CLAUDE.md,
 * règle 3) : elle sert seulement à proposer l'autre version.
 */
export function browserLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null;
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const primary = (tag ?? '').toLowerCase().split('-')[0];
    const found = LOCALES.find((locale) => locale === primary);
    if (found) return found;
  }
  return null;
}
