import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { localePrefix } from '../../core/i18n/locale';
import { ThemeService } from '../../core/theme/theme.service';
import { WakeLockService } from '../../core/platform/wake-lock.service';
import { Button } from '../ui/button/button';
import { Icon } from '../ui/icon/icon';

/**
 * En-tête du site : marque, navigation, et les trois commandes de confort du
 * lecteur (assombrir, garder l'écran allumé, changer de langue).
 *
 * Le changement de langue est un vrai lien vers l'URL de l'autre langue, pas un
 * état interne : c'est ce qui rend les deux versions indexables.
 */
@Component({
  selector: 'fil-site-header',
  imports: [Button, Icon, RouterLink, RouterLinkActive],
  host: { class: 'nav' },
  template: `
    <a class="nav-brand" [routerLink]="i18n.link('home')">
      Fil <small>crochet &amp; tricot</small>
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
    </nav>

    <div class="tools">
      <button
        type="button"
        filButton="secondary"
        [iconOnly]="true"
        [attr.aria-pressed]="theme.dim()"
        [attr.aria-label]="i18n.t('ui.dim')"
        [title]="i18n.t('ui.dim')"
        (click)="theme.toggle()"
      >
        <fil-icon name="moon" />
      </button>

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

      <a filButton="secondary" [href]="otherLanguageHref()" [attr.hreflang]="i18n.other()">
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
  protected readonly theme = inject(ThemeService);
  protected readonly wakeLock = inject(WakeLockService);

  /** Lien vers l'accueil de l'autre langue — une vraie URL, pas un état interne. */
  protected otherLanguageHref(): string {
    const prefix = localePrefix(this.i18n.other());
    return prefix === '' ? '/' : prefix;
  }
}
