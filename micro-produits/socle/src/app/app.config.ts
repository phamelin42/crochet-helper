import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AnalyticsService } from './core/analytics/analytics.service';
import { UpdateService } from './core/platform/update.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    // Sans `withEventReplay()` : ses scripts inline seraient bloqués par la
    // CSP `script-src 'self'` (même choix que Pattern Reader).
    provideClientHydration(),
    // Services sans UI démarrés dès la première page : service worker natif
    // (sans `@angular/service-worker` côté page) et mesure d'audience.
    provideAppInitializer(() => {
      inject(UpdateService);
      inject(AnalyticsService);
    }),
  ],
};
