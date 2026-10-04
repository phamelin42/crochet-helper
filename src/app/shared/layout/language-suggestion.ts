import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { Locale } from '../../core/i18n/locale';
import { browserLocale } from '../../core/platform/browser-language';
import { StylesheetService } from '../../core/platform/stylesheet.service';
import { SeoService } from '../../core/seo/seo.service';
import { LocalStorageService } from '../../core/storage/local-storage.service';
import { Button } from '../ui/button/button';
import { Icon } from '../ui/icon/icon';

/** Clé du refus : une lectrice qui a dit « non » une fois ne revoit pas la question. */
export const SUGGESTION_DISMISSED_KEY = 'fil.languageSuggestion.dismissed';

/**
 * Écrit dans la langue proposée, pas dans celle de la page : c'est à la
 * lectrice qui la parle qu'il s'adresse.
 */
const COPY: Record<Locale, { text: string; go: string; close: string }> = {
  fr: {
    text: 'Ce site existe en français.',
    go: 'Passer en français',
    close: 'Rester en anglais',
  },
  en: {
    text: 'This site is also in English.',
    go: 'Switch to English',
    close: 'Stay in French',
  },
};

/**
 * Propose la version de la page dans la langue du navigateur, sans jamais y
 * rediriger : la langue vient de l'URL (CLAUDE.md, règle 3), et les deux
 * versions restent celles que les moteurs indexent. Monté par `App` après le
 * premier affichage, avec sa feuille `language.css` ; il ne s'affiche que
 * quand les deux langues diffèrent. Posé en surimpression, il ne décale rien
 * (CLS).
 */
@Component({
  selector: 'fil-language-suggestion',
  imports: [Button, Icon],
  template: `
    @if (visible()) {
      <aside class="lang-suggest" [attr.lang]="target()" [attr.aria-label]="copy().text">
        <span>{{ copy().text }}</span>
        <a filButton="primary" [href]="href()" [attr.hreflang]="target()">{{ copy().go }}</a>
        <button
          type="button"
          filButton="ghost"
          [iconOnly]="true"
          [attr.aria-label]="copy().close"
          (click)="dismiss()"
        >
          <fil-icon name="close" />
        </button>
      </aside>
    }
  `,
})
export class LanguageSuggestion {
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly storage = inject(LocalStorageService);
  /** Pas de bandeau sans sa feuille : il s'afficherait dans le flux, sans mise en forme. */
  private readonly styled = signal(false);
  private readonly dismissed = signal(
    this.storage.read<boolean>(SUGGESTION_DISMISSED_KEY) === true,
  );

  /** Langue proposée : celle du navigateur, quand ce n'est pas celle de la page. */
  readonly target = input<Locale | null>(browserLocale());

  protected readonly visible = computed(() => {
    const target = this.target();
    return this.styled() && !!target && target !== this.i18n.locale() && !this.dismissed();
  });

  constructor() {
    const styles = inject(StylesheetService);
    // La feuille ne vient que s'il y a quelque chose à proposer.
    effect(() => {
      if (this.target() && !this.dismissed()) {
        void styles.load('language.css').then(() => this.styled.set(true));
      }
    });
  }
  protected readonly copy = computed(() => COPY[this.target() ?? 'fr']);
  /** La même page dans l'autre langue, à défaut son accueil. */
  protected readonly href = computed(() => {
    const target = this.target();
    if (!target) return '/';
    return this.seo.alternates()[target] ?? this.i18n.otherLocaleHref();
  });

  protected dismiss(): void {
    this.dismissed.set(true);
    this.storage.write(SUGGESTION_DISMISSED_KEY, true);
  }
}
