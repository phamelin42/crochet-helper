import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { localePrefix } from '../../core/i18n/locale';
import { WakeLockService } from '../../core/platform/wake-lock.service';
import { Button } from '../ui/button/button';
import { Icon } from '../ui/icon/icon';

/**
 * En-tête du site : marque, navigation, et les commandes de confort du
 * lecteur (garder l'écran allumé, changer de langue).
 *
 * Le changement de langue est un vrai lien vers l'URL de l'autre langue, pas un
 * état interne : c'est ce qui rend les deux versions indexables.
 */
@Component({
  selector: 'fil-site-header',
  imports: [Button, Icon, RouterLink, RouterLinkActive],
  host: { class: 'nav' },
  template: `
    <a class="nav-brand" [routerLink]="i18n.link('reader')">
      <svg
        class="brand-mark"
        viewBox="0 0 64 64"
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="30" cy="36" r="20" />
        <path d="M16 22c8 6 13 15 15 27" />
        <path d="M25 17c9 5 15 14 17 26" />
        <path d="M11 32c11 1 20 8 24 19" />
        <path d="M20 51 52 12" />
        <path d="M44 10c5-2 9 1 8 5-1 3-5 4-7 2" />
      </svg>
      <span>Crochet helper</span>
    </a>

    <nav class="nav-links" [attr.aria-label]="i18n.t('nav.home')">
      <a [routerLink]="i18n.link('reader')" routerLinkActive="active" ariaCurrentWhenActive="page">
        {{ i18n.t('nav.reader') }}
      </a>
      <a
        [routerLink]="i18n.link('glossary')"
        routerLinkActive="active"
        ariaCurrentWhenActive="page"
      >
        {{ i18n.t('nav.glossary') }}
      </a>
      <a [routerLink]="i18n.link('format')" routerLinkActive="active" ariaCurrentWhenActive="page">
        {{ i18n.t('nav.format') }}
      </a>
    </nav>

    <div class="tools">
      @if (wakeLock.supported()) {
        <button
          type="button"
          filButton="secondary"
          [iconOnly]="true"
          [attr.aria-pressed]="wakeLock.active()"
          [attr.aria-label]="i18n.t('ui.wake')"
          [title]="i18n.t('ui.wake')"
          (click)="wakeLock.toggle()"
        >
          <fil-icon name="eye" />
        </button>
      }

      <a
        filButton="secondary"
        [iconOnly]="true"
        [href]="otherLanguageHref()"
        [attr.hreflang]="i18n.other()"
      >
        {{ i18n.other().toUpperCase() }}
      </a>
    </div>
  `,
  styles: `
    .nav-links a.active {
      color: var(--color-accent);
    }
  `,
})
export class SiteHeader {
  protected readonly i18n = inject(I18nService);
  protected readonly wakeLock = inject(WakeLockService);

  /** Lien vers l'accueil de l'autre langue — une vraie URL, pas un état interne. */
  protected otherLanguageHref(): string {
    const prefix = localePrefix(this.i18n.other());
    return prefix === '' ? '/' : prefix;
  }
}
