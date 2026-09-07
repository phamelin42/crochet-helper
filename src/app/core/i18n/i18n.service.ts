import { Service, computed, signal } from '@angular/core';
import { DEFAULT_LOCALE, Locale, localePrefix } from './locale';
import { ROUTE_PATHS, RouteName } from './route-paths';
import { TRANSLATIONS, TranslationKey } from './translations';

/**
 * Langue courante et traduction d'interface.
 *
 * La langue vient de l'URL (`/` pour le français, `/en` pour l'anglais), pas
 * d'une préférence stockée : c'est ce qui rend chaque langue indexable et
 * pré-rendue indépendamment. Le service est fourni à la racine, donc chaque
 * rendu serveur dispose de sa propre instance.
 */
@Service()
export class I18nService {
  private readonly current = signal<Locale>(DEFAULT_LOCALE);

  readonly locale = this.current.asReadonly();
  readonly prefix = computed(() => localePrefix(this.current()));
  readonly other = computed<Locale>(() => (this.current() === 'fr' ? 'en' : 'fr'));

  setLocale(locale: Locale): void {
    this.current.set(locale);
  }

  /** Traduit une clé dans la langue courante ; retombe sur le français. */
  t(key: TranslationKey): string {
    return TRANSLATIONS[this.current()][key] ?? TRANSLATIONS[DEFAULT_LOCALE][key];
  }

  /** Lien interne vers une page nommée, dans la langue courante. */
  link(route: RouteName): string {
    const segment = ROUTE_PATHS[route][this.current()];
    return `${this.prefix()}${segment === '/' ? '' : segment}` || '/';
  }
}
