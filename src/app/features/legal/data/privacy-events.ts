import type { AnalyticsEvent } from '../../../core/analytics/analytics.service';
import type { Locale } from '../../../core/i18n/locale';

/**
 * Chaque événement mesuré, dit en clair. Le type `Record<AnalyticsEvent, …>`
 * est le point : ajouter un événement à `AnalyticsEvent` sans le décrire ici
 * casse le build, donc la page de confidentialité ne peut pas devenir fausse
 * en silence.
 */
export const PRIVACY_EVENTS: Record<AnalyticsEvent, Record<Locale, string>> = {
  pattern_pasted: {
    fr: 'un patron est collé (sa longueur, arrondie à la centaine, jamais son texte)',
    en: 'a pattern is pasted (its length rounded to the hundred, never its text)',
  },
  pattern_parsed: {
    fr: 'un patron est découpé en étapes (nombre d’étapes, pas leur contenu)',
    en: 'a pattern is split into steps (the number of steps, not their content)',
  },
  step_advanced: { fr: 'on passe à l’étape suivante', en: 'you move on to the next step' },
  glossary_hover: {
    fr: 'une abréviation est survolée dans le lecteur',
    en: 'an abbreviation is hovered in the reader',
  },
  session_resumed: { fr: 'un projet est repris à l’ouverture', en: 'a project is resumed on open' },
  pdf_imported: {
    fr: 'un PDF est importé (nombre de pages et de photos)',
    en: 'a PDF is imported (number of pages and pictures)',
  },
  pdf_failed: {
    fr: 'un PDF n’a pas pu être lu (la raison de l’échec)',
    en: 'a PDF could not be read (the reason it failed)',
  },
  term_tried: {
    fr: 'le rang d’essai d’une page d’abréviation est modifié',
    en: 'the practice row on an abbreviation page is edited',
  },
  conversion_run: {
    fr: 'un patron est converti entre conventions US et UK',
    en: 'a pattern is converted between US and UK conventions',
  },
  project_created: { fr: 'un nouveau projet est ouvert', en: 'a new project is opened' },
  project_resumed: {
    fr: 'un projet est repris depuis la liste',
    en: 'a project is resumed from the list',
  },
  project_shared: {
    fr: 'un lien de projet est copié (ancien bouton, retiré)',
    en: 'a project link is copied (former button, removed)',
  },
  pattern_shared: { fr: 'le lien d’un patron est copié', en: 'a pattern link is copied' },
  project_received: {
    fr: 'un projet est ouvert depuis un lien reçu',
    en: 'a project is opened from a received link',
  },
  backup_exported: {
    fr: 'une sauvegarde est téléchargée (nombre de projets)',
    en: 'a backup is downloaded (number of projects)',
  },
  backup_imported: {
    fr: 'une sauvegarde est réimportée (nombre de projets)',
    en: 'a backup is imported again (number of projects)',
  },
  returning_visit_1d: {
    fr: 'retour, un jour après la première visite',
    en: 'a return, one day after the first visit',
  },
  returning_visit_2_7d: {
    fr: 'retour, de 2 à 7 jours après la première visite',
    en: 'a return, 2 to 7 days after the first visit',
  },
  returning_visit_8_30d: {
    fr: 'retour, de 8 à 30 jours après la première visite',
    en: 'a return, 8 to 30 days after the first visit',
  },
  returning_visit_31d: {
    fr: 'retour, plus de 30 jours après la première visite',
    en: 'a return, more than 30 days after the first visit',
  },
  reading_depth_5: {
    fr: 'la 5ᵉ étape d’un patron est atteinte',
    en: 'step 5 of a pattern is reached',
  },
  reading_depth_20: {
    fr: 'la 20ᵉ étape d’un patron est atteinte',
    en: 'step 20 of a pattern is reached',
  },
  reading_depth_50: {
    fr: 'la 50ᵉ étape d’un patron est atteinte',
    en: 'step 50 of a pattern is reached',
  },
  waitlist_shown: {
    fr: 'la ligne de liste d’attente est affichée',
    en: 'the waiting-list line is shown',
  },
  waitlist_clicked: {
    fr: 'le lien de la liste d’attente est cliqué',
    en: 'the waiting-list link is clicked',
  },
  reading_pref_changed: {
    fr: 'la taille du texte, le fond sombre ou l’affichage d’un nouveau patron est changé',
    en: 'the text size, dark background or display of a new pattern is changed',
  },
  focus_mode_toggled: {
    fr: 'le mode page pleine est activé ou quitté',
    en: 'full-page mode is entered or left',
  },
  home_cta: {
    fr: 'un bouton du bandeau d’accueil est cliqué (exemple ou collage)',
    en: 'a button of the welcome banner is clicked (example or paste)',
  },
  step_jumped: { fr: 'on saute directement à une étape', en: 'you jump straight to a step' },
  print_opened: { fr: 'l’impression est ouverte', en: 'printing is opened' },
  row_counted: {
    fr: 'le compteur de rangs en ligne passe un palier de dix',
    en: 'the online row counter passes a multiple of ten',
  },
  image_opened: {
    fr: 'une photo d’un patron PDF est agrandie',
    en: 'a picture from a PDF pattern is enlarged',
  },
  view_changed: {
    fr: 'l’affichage du lecteur change (texte ou diagramme)',
    en: 'the reader view changes (text or chart)',
  },
  view_chosen: {
    fr: 'la lectrice répond à la question « étapes écrites ou diagramme ? » (la réponse et si elle est retenue)',
    en: 'the reader answers “written steps or chart?” (the answer and whether it is remembered)',
  },
  stitch_marked: {
    fr: 'une maille est touchée dans le diagramme (une fois par tour, jamais laquelle)',
    en: 'a stitch is tapped in the chart (once per round, never which one)',
  },
  grid_created: {
    fr: 'une image devient une grille de mailles (largeur à la dizaine, nombre de couleurs, à plat ou en rond ; jamais l’image ni ses couleurs)',
    en: 'a picture becomes a stitch grid (width to the nearest ten, number of colours, flat or in the round; never the picture or its colours)',
  },
  grid_stitch_marked: {
    fr: 'une maille est touchée dans la grille de couleurs (une fois par rang, jamais laquelle)',
    en: 'a stitch is tapped in the colour grid (once per row, never which one)',
  },
  chart_transcribed: {
    fr: 'un diagramme est transcrit en texte (nombre de tours, convention, lu automatiquement ou à la main)',
    en: 'a chart is transcribed to text (number of rounds, convention, read automatically or by hand)',
  },
  chart_recognized: {
    fr: 'un diagramme est lu automatiquement (nombre de tours et de symboles lus, jamais l’image)',
    en: 'a chart is read automatically (number of rounds and symbols read, never the image)',
  },
  gauge_calculated: {
    fr: 'un échantillon est comparé à celui du patron (unité, conseil)',
    en: 'a gauge is compared with the pattern’s (unit, advice)',
  },
  glossary_filtered: {
    fr: 'un filtre du glossaire est changé (jamais la recherche)',
    en: 'a glossary filter is changed (never the search text)',
  },
  foreign_pattern_tried: {
    fr: 'une première saisie sur la page « lire un patron dans l’autre langue » (longueur)',
    en: 'a first entry on the “read a pattern in the other language” page (length)',
  },
  install_prompted: {
    fr: 'l’invite d’installation du navigateur est affichée',
    en: 'the browser’s install prompt is shown',
  },
  app_installed: { fr: 'l’application est installée', en: 'the app is installed' },
  app_opened: {
    fr: 'l’application est ouverte (une fois par session, depuis le Play Store ou l’écran d’accueil)',
    en: 'the app is opened (once per session, from the Play Store or the home screen)',
  },
  app_tab_selected: {
    fr: 'un onglet de l’application est touché (lire, projets, glossaire ou réglages)',
    en: 'an app tab is tapped (read, projects, glossary or settings)',
  },
};

export const PRIVACY_EVENT_NAMES = Object.keys(PRIVACY_EVENTS) as AnalyticsEvent[];
