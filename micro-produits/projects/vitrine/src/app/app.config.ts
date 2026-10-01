import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AnalyticsService, PRODUIT, ProduitConfig, ThemeService, UpdateService } from '@mp/core';
import produit from '../../produit.json';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    // Sans `withEventReplay()` : ses scripts inline seraient bloqués par la CSP.
    provideClientHydration(),
    { provide: PRODUIT, useValue: produit as ProduitConfig },
    provideAppInitializer(() => {
      inject(UpdateService);
      inject(AnalyticsService);
      inject(ThemeService);
    }),
  ],
};
