import { Locale } from './locale';

/**
 * Dictionnaires d'interface pour la coquille de l'application (en-tête,
 * navigation) : ce module fait partie du bundle initial, donc seuls les
 * textes affichés avant toute navigation vivent ici. Le texte propre à une
 * page paresseuse vit dans cette page — voir `features/reader/data/reader-copy.ts`
 * et `features/reader/pages/projects-page.ts` pour l'exemple.
 *
 * `fr` fait autorité : toute clé ajoutée ici doit exister dans les deux
 * langues, ce que `TranslationKey` garantit au compilateur.
 */
export const FR = {
  'ui.wake': "Garder l'écran allumé",
  'ui.skipToContent': 'Aller au contenu',
  'nav.reader': 'Lecteur',
  'nav.glossary': 'Glossaire',
  'nav.home': 'Accueil',
  'nav.format': 'Bien formater',
  'nav.converter': 'US ↔ UK',
  'nav.projects': 'Mes projets',
  'ui.update': 'Mettre à jour',
  'ui.discord': 'Rejoindre le Discord',
} as const;

export type TranslationKey = keyof typeof FR;

export const EN: Record<TranslationKey, string> = {
  'ui.wake': 'Keep screen awake',
  'ui.skipToContent': 'Skip to content',
  'nav.reader': 'Reader',
  'nav.glossary': 'Glossary',
  'nav.home': 'Home',
  'nav.format': 'Formatting',
  'nav.converter': 'US ↔ UK',
  'nav.projects': 'My projects',
  'ui.update': 'Update',
  'ui.discord': 'Join the Discord',
};

export const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = { fr: FR, en: EN };
