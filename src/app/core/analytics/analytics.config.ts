/** Origine du collecteur. Vide = mesure désactivée (le service devient inerte). */
export const ANALYTICS_ORIGIN = 'https://analytics.patternreader.com';
export const ANALYTICS_SITE_ID = '5c4ab0af-acd1-483c-be39-2404ce5f0510';
/**
 * Seuls hôtes où le traceur est chargé. Ailleurs (CI, `localhost`, aperçus
 * Vercel), le charger compterait comme visites les passages des tests : le
 * 23/09/2026, 7 visites sur 10 venaient de `localhost`.
 */
export const ANALYTICS_HOSTNAMES: readonly string[] = [
  'patternreader.com',
  'www.patternreader.com',
];
