import {
  ApplicationConfig,
  ApplicationRef,
  Injector,
  PLATFORM_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { UpdateService } from './core/platform/update.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    // `withEventReplay()` est volontairement absent. Il rejouerait les clics
    // survenus avant l'hydratation, mais pour cela il injecte deux scripts
    // inline (`ng-event-dispatch-contract` et l'appel à
    // `__jsaction_bootstrap`). Notre CSP porte `script-src 'self'` : ils sont
    // bloqués, et la console se remplit de violations.
    //
    // Le site étant entièrement pré-rendu et son bundle réduit, la fenêtre
    // avant hydratation est de quelques dizaines de millisecondes. La seule
    // alternative serait d'inscrire les empreintes SHA-256 de ces scripts dans
    // la CSP, à régénérer à chaque montée de version d'Angular : trop de
    // maintenance pour ce que ça protège.
    provideClientHydration(),
    // Services sans UI : le service worker (sans `@angular/service-worker`
    // côté page, voir `UpdateService`) et l'anticipation de la page suivante.
    // Cette dernière ne sert pas au premier affichage : son code arrive par
    // `import()` une fois la page rendue, hors du bundle initial (2,2 ko).
    provideAppInitializer(() => {
      inject(UpdateService);
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
      const injector = inject(Injector);
      void inject(ApplicationRef)
        .whenStable()
        .then(() => import('./core/platform/route-prefetch'))
        .then(({ RoutePrefetch }) => injector.get(RoutePrefetch));
    }),
  ],
};
