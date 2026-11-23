import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LocalizedPath } from '../../../core/i18n/route-paths';
import { Locale } from '../../../core/i18n/locale';
import { BrowserLocation } from '../../../core/platform/browser-location.service';
import { RavelryAccess } from '../../../core/ravelry/ravelry-access';
import { RAVELRY_CALLBACK_PATH } from '../../../core/ravelry/ravelry-connection-config';
import { RavelrySession } from '../../../core/ravelry/ravelry-session.service';
import { SeoService } from '../../../core/seo/seo.service';
import { Button } from '../../../shared/ui/button/button';
import { CONNECT_COPY, ConnectCopy } from '../data/connect-copy';

const PATH: LocalizedPath = { fr: RAVELRY_CALLBACK_PATH, en: RAVELRY_CALLBACK_PATH };
type Failure = keyof ConnectCopy['callbackFailures'];

/**
 * Adresse de retour de Ravelry (`/ravelry-callback`), unique et indépendante de la
 * langue : celle que Ravelry a enregistrée. Pré-rendue avec un texte d'attente dans
 * les deux langues (la langue de la lectrice n'est connue qu'au retour, par le départ
 * gardé le temps de l'aller-retour). Elle efface `code` et `state` de l'adresse dès
 * sa création, vérifie l'aller-retour, enregistre la connexion, puis ramène la
 * lectrice où elle était. Sans interrupteur (`RAVELRY_URL` vide), elle n'appelle rien.
 */
@Component({
  selector: 'fil-ravelry-callback-page',
  imports: [Button, RouterLink],
  host: { class: 'wrap' },
  template: `
    <article class="discover">
      @if (copy(); as c) {
        <h1>{{ c.loginTitle }}</h1>
      } @else {
        <h1>
          <span lang="fr">Connexion à Ravelry</span> /
          <span lang="en">Connecting to Ravelry</span>
        </h1>
      }

      @if (failure(); as why) {
        <div role="alert" class="discover-alert">
          @if (copy(); as c) {
            <p>{{ c.callbackFailures[why] }}</p>
          } @else {
            <p lang="fr">{{ fr.callbackFailures[why] }}</p>
            <p lang="en">{{ en.callbackFailures[why] }}</p>
          }
          <div class="discover-actions">
            @if (why !== 'off') {
              <button type="button" filButton="primary" [disabled]="busy()" (click)="retry()">
                {{ copy()?.callbackRetry ?? en.callbackRetry }}
              </button>
            }
            <a filButton="secondary" [routerLink]="i18n.link('findPattern')">
              {{ copy()?.callbackBack ?? en.callbackBack }}
            </a>
          </div>
        </div>
      } @else {
        <p role="status">
          @if (copy(); as c) {
            {{ c.callbackProgress }}
          } @else {
            <span lang="fr">{{ fr.callbackProgress }}</span>
            <br />
            <span lang="en">{{ en.callbackProgress }}</span>
          }
        </p>
      }
    </article>
  `,
})
export default class RavelryCallbackPage {
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly session = inject(RavelrySession);
  private readonly location = inject(BrowserLocation);
  private readonly enabled = inject(RavelryAccess).enabled;

  protected readonly fr = CONNECT_COPY.fr;
  protected readonly en = CONNECT_COPY.en;
  private readonly locale = signal<Locale | null>(null);
  protected readonly copy = computed(() => {
    const l = this.locale();
    return l === null ? null : CONNECT_COPY[l];
  });
  protected readonly failure = signal<Failure | null>(null);
  protected readonly busy = signal(false);

  constructor() {
    this.apply('en');
    // `code` et `state` sortent de l'adresse tout de suite, avant que le traceur de mesure
    // ne charge : ils ne doivent figurer ni dans l'historique ni dans une mesure d'audience.
    const search = this.location.search();
    if (search !== '') this.location.replaceUrl(RAVELRY_CALLBACK_PATH);
    afterNextRender(() => void this.finish(search));
  }

  private apply(locale: Locale): void {
    const c = CONNECT_COPY[locale];
    this.seo.apply({
      title: c.callbackTitle,
      description: c.callbackDescription,
      path: PATH,
      locale,
      noIndex: true,
    });
  }

  private async finish(search: string): Promise<void> {
    if (!this.enabled) {
      this.failure.set('off');
      return;
    }
    const outcome = await this.session.complete(search);
    if (outcome.locale !== null) {
      this.locale.set(outcome.locale);
      this.i18n.setLocale(outcome.locale);
      this.apply(outcome.locale);
    }
    if (outcome.ok) {
      await this.router.navigateByUrl(outcome.returnTo ?? this.i18n.link('findPattern'), {
        replaceUrl: true,
      });
      return;
    }
    this.failure.set(outcome.reason);
  }

  protected async retry(): Promise<void> {
    this.busy.set(true);
    if (!(await this.session.begin(this.i18n.link('findPattern')))) {
      this.busy.set(false);
      this.failure.set('off');
    }
  }
}
