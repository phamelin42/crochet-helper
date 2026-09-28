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
  'nav.format': 'Préparer un patron',
  'nav.converter': 'US ↔ UK',
  'nav.projects': 'Mes projets',
  'ui.update': 'Mettre à jour',
  'ui.discord': 'Rejoindre le Discord',
  'footer.tools': 'Outils',
  'footer.learn': 'Apprendre',
  'footer.project': 'Le projet',
  'footer.forDesigners': 'Vous créez des patrons ?',
  'footer.guideReadingPattern': 'Lire un patron',
  'footer.guideReadingChart': 'Lire un diagramme',
  'footer.guideCrochetOrKnitting': 'Crochet ou tricot',
  'footer.tagline':
    'Gratuit, sans compte. Vos patrons restent sur votre appareil ; seule une mesure d’audience anonyme est collectée.',
} as const;

export type TranslationKey = keyof typeof FR;

export const EN: Record<TranslationKey, string> = {
  'ui.wake': 'Keep screen awake',
  'ui.skipToContent': 'Skip to content',
  'nav.reader': 'Reader',
  'nav.glossary': 'Glossary',
  'nav.home': 'Home',
  'nav.format': 'Prepare a pattern',
  'nav.converter': 'US ↔ UK',
  'nav.projects': 'My projects',
  'ui.update': 'Update',
  'ui.discord': 'Join the Discord',
  'footer.tools': 'Tools',
  'footer.learn': 'Learn',
  'footer.project': 'The project',
  'footer.forDesigners': 'Do you design patterns?',
  'footer.guideReadingPattern': 'Reading a pattern',
  'footer.guideReadingChart': 'Reading a chart',
  'footer.guideCrochetOrKnitting': 'Crochet or knitting',
  'footer.tagline':
    'Free, no account. Your patterns stay on your device; only an anonymous audience measurement is collected.',
};

export const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = { fr: FR, en: EN };
