import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { UpdateService } from '../../core/platform/update.service';
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
      <svg class="brand-mark" viewBox="0 0 64 64" width="32" height="32" aria-hidden="true">
        <path class="bm-hook" d="M42 5 54 27M42 5c-2-3-7-3-7 1 0 2 3 3 4 1" />
        <circle class="bm-ball" cx="30" cy="38" r="22" />
        <path
          class="bm-yarn"
          d="M13 27c9 3 20 14 24 31M22 18c9 5 18 18 20 37M9 42c12 0 23 7 28 17"
        />
      </svg>
      <span>Pattern Reader</span>
    </a>

    <nav class="nav-links" [attr.aria-label]="i18n.t('nav.home')">
      <a
        [routerLink]="i18n.link('reader')"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
      >
        {{ i18n.t('nav.reader') }}
      </a>
      <a
        [routerLink]="i18n.link('projects')"
        routerLinkActive="active"
        ariaCurrentWhenActive="page"
      >
        {{ i18n.t('nav.projects') }}
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
      <a
        [routerLink]="i18n.link('converter')"
        routerLinkActive="active"
        ariaCurrentWhenActive="page"
      >
        {{ i18n.t('nav.converter') }}
      </a>
    </nav>

    <div class="tools">
      @if (update.updateAvailable()) {
        <button type="button" filButton="secondary" (click)="update.activateUpdate()">
          {{ i18n.t('ui.update') }}
        </button>
      }

      <!--
        Support de l'API wakeLock : inconnaissable côté serveur, donc
        toujours faux au pré-rendu. Sans cet emplacement de taille fixe, son
        apparition après l'hydratation (sur les navigateurs qui le supportent)
        décale tout l'en-tête — mesuré : CLS ≈ 0,34 sur les trois pages.
      -->
      <span class="tool-slot">
        @if (wakeLock.supported()) {
          <button
            type="button"
            filButton="secondary"
            [iconText]="true"
            [attr.aria-pressed]="wakeLock.active()"
            [attr.aria-label]="i18n.t('ui.wake')"
            [title]="i18n.t('ui.wake')"
            (click)="wakeLock.toggle()"
          >
            <fil-icon name="eye" />
            <span class="visually-hidden">{{ i18n.t('ui.wake') }}</span>
          </button>
        }
      </span>

      <a
        filButton="secondary"
        [iconText]="true"
        href="https://discord.gg/DPYydhZRND"
        target="_blank"
        rel="noopener"
        [attr.aria-label]="i18n.t('ui.discord')"
        [title]="i18n.t('ui.discord')"
      >
        <fil-icon name="discord" />
        <span class="visually-hidden">{{ i18n.t('ui.discord') }}</span>
      </a>

      <a
        filButton="secondary"
        [iconOnly]="true"
        [href]="i18n.otherLocaleHref()"
        [attr.hreflang]="i18n.other()"
      >
        {{ i18n.other().toUpperCase() }}
      </a>
    </div>
  `,
})
export class SiteHeader {
  protected readonly i18n = inject(I18nService);
  protected readonly wakeLock = inject(WakeLockService);
  protected readonly update = inject(UpdateService);
}
