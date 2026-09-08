import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
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
  ],
};
