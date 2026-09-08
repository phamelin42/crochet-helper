import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ByokService } from '../../core/ai/byok.service';
import { PROVIDERS, ProviderId } from '../../core/ai/providers';
import { I18nService } from '../../core/i18n/i18n.service';
import { Locale } from '../../core/i18n/locale';
import { ROUTE_PATHS } from '../../core/i18n/route-paths';
import { SeoService } from '../../core/seo/seo.service';
import { Button } from '../../shared/ui/button/button';
import { InputField } from '../../shared/ui/field/input';

/**
 * Page « Connecter son IA ».
 *
 * Explique, fournisseur par fournisseur, comment obtenir une clé d'API, puis
 * la range dans le navigateur. Elle est pré-rendue et indexable comme les
 * autres : la partie explicative est du contenu, seule la saisie de clé
 * dépend du navigateur.
 */
@Component({
  selector: 'fil-connect-ai-page',
  imports: [Button, InputField],
  template: `
    <div class="wrap">
      <section>
        <h1>{{ t('ai.pageTitle') }}</h1>
        <p class="lead">{{ t('ai.pageLead') }}</p>

        <p class="warn">{{ t('ai.pageWarn') }}</p>

        <h2>{{ t('ai.pageSteps') }}</h2>
        <ol class="steps">
          @for (provider of providers; track provider.id) {
            <li>
              <h3>{{ provider.label }}</h3>
              <p>{{ howTo(provider.id) }}</p>
              <p class="mono">
                {{ t('ai.pageConsole') }}
                <a [href]="provider.console" target="_blank" rel="noopener noreferrer">{{
                  provider.console
                }}</a>
              </p>
              <p class="mono">
                {{ t('ai.pagePrefix') }} <code>{{ provider.keyPrefix }}…</code>
              </p>
            </li>
          }
        </ol>

        <h2>{{ t('ai.pageForm') }}</h2>
        <div class="field">
          <label for="byok-provider">{{ t('ai.pageProvider') }}</label>
          <select id="byok-provider" [value]="choice()" (change)="pick($event)">
            @for (provider of providers; track provider.id) {
              <option [value]="provider.id">{{ provider.label }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="byok-key">{{ t('ai.pageKey') }}</label>
          <input
            filInput
            id="byok-key"
            type="password"
            autocomplete="off"
            spellcheck="false"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
          />
        </div>

        <div class="import-actions">
          <button type="button" filButton="primary" (click)="save()">{{ t('ai.pageSave') }}</button>
          <button type="button" filButton="ghost" (click)="forget()">
            {{ t('ai.pageForget') }}
          </button>
        </div>

        @if (saved()) {
          <p class="hint" role="status">{{ t('ai.pageSaved') }}</p>
        } @else if (byok.configured()) {
          <p class="hint">{{ t('ai.pageActive') }}</p>
        }
      </section>
    </div>
  `,
})
export class ConnectAiPage {
  protected readonly byok = inject(ByokService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? 'fr';

  protected readonly providers = PROVIDERS;
  protected readonly choice = signal<string>(this.byok.providerId());
  protected readonly draft = signal('');
  protected readonly saved = signal(false);

  protected t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      title: this.t('ai.pageTitle'),
      description: this.t('ai.pageLead'),
      path: ROUTE_PATHS.connectAi,
      locale: this.locale,
    });
  }

  protected howTo(id: ProviderId): string {
    switch (id) {
      case 'anthropic':
        return this.t('ai.howAnthropic');
      case 'openai':
        return this.t('ai.howOpenai');
      default:
        return this.t('ai.howPerplexity');
    }
  }

  protected pick(event: Event): void {
    this.choice.set((event.target as HTMLSelectElement).value);
  }

  protected save(): void {
    this.byok.save(this.choice(), this.draft());
    this.draft.set('');
    this.saved.set(true);
  }

  protected forget(): void {
    this.byok.forget();
    this.draft.set('');
    this.saved.set(false);
  }
}
