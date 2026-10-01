import { Component, EnvironmentInjector, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { RouteName } from '../../core/i18n/route-paths';
import { SITE_NAME } from '../../core/seo/site';
import { TabBar, TabItem } from '../ui/tab-bar/tab-bar';

type TabId = 'read' | 'projects' | 'glossary' | 'settings';

const TABS: readonly { id: TabId; route: RouteName; icon: TabItem['icon'] }[] = [
  { id: 'read', route: 'reader', icon: 'book' },
  { id: 'projects', route: 'projects', icon: 'folder' },
  { id: 'glossary', route: 'glossary', icon: 'glossary' },
  { id: 'settings', route: 'settings', icon: 'sliders' },
];

/**
 * Coquille d'application : barre de titre en haut, onglets en bas. Toujours
 * dans le DOM, mais `display: none` hors mode appli (`lecteur.css`) : absente
 * de l'arbre d'accessibilité et du référencement, et le premier affichage
 * d'une application installée est juste sans attendre le JavaScript.
 */
@Component({
  selector: 'fil-app-chrome',
  imports: [TabBar],
  template: `
    <div class="app-bar" aria-hidden="true">{{ title() }}</div>
    <fil-tab-bar
      [tabs]="tabs()"
      [current]="current()"
      [label]="i18n.t('tab.label')"
      (selected)="onSelected($event)"
    />
  `,
})
export class AppChrome {
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly injector = inject(EnvironmentInjector);
  private readonly url = signal(this.router.url);

  protected readonly tabs = computed<TabItem[]>(() =>
    TABS.map((tab) => ({
      id: tab.id,
      label: this.i18n.t(`tab.${tab.id}`),
      icon: tab.icon,
      href: this.i18n.link(tab.route),
    })),
  );

  protected readonly current = computed<TabId | null>(() => {
    const path = this.url()
      .split(/[?#]/)[0]
      .replace(/(.)\/$/, '$1');
    const found = this.tabs().find(({ href, id }) =>
      id === 'read' ? path === href : path === href || path.startsWith(`${href}/`),
    );
    return (found?.id as TabId | undefined) ?? null;
  });

  protected readonly title = computed(() => {
    const id = this.current();
    return id ? this.i18n.t(`tab.${id}`) : SITE_NAME;
  });

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.url.set(event.urlAfterRedirects);
    });
  }

  protected onSelected(tab: string): void {
    // Dans le gestionnaire du clic, jamais depuis un `effect` : l'événement
    // part au moment du geste. Chargée à la demande, la mesure ne pèse rien
    // sur le premier affichage.
    void import('../../core/analytics/analytics.service').then(({ AnalyticsService }) =>
      this.injector.get(AnalyticsService).track('app_tab_selected', { tab }),
    );
  }
}
