import { InjectionToken } from '@angular/core';

/** Formulaire externe de la liste d'attente. Vide = rien ne s'affiche. */
export const WAITLIST_URL = 'https://tally.so/r/A7Z2ve';

/** Injectable pour la remplacer en test, sans toucher à la constante ni au reste du code. */
export const WAITLIST_URL_TOKEN = new InjectionToken<string>('fil.waitlistUrl', {
  providedIn: 'root',
  factory: () => WAITLIST_URL,
});
