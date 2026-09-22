import { Locale } from '../../../core/i18n/locale';

/**
 * Textes propres à la page du lecteur et à ses composants. Ils vivent ici
 * plutôt que dans le dictionnaire global (`core/i18n/translations.ts`) pour
 * rester dans le chunk paresseux de la page : le dictionnaire global fait
 * partie du bundle initial (budget 320 kB).
 */
const FR = {
  'ui.import': 'Le pattern',
  'ui.paste': 'Texte du pattern',
  'ui.placeholder':
    'Rang 1 : 6 ms dans un cercle magique (6)\nRang 2 : 1 aug dans chaque m (12)\nRangs 3-6 : 1 ms dans chaque m (12)',
  'ui.load': 'Découper en étapes',
  'ui.demo': 'Exemple',
  'ui.clear': 'Effacer',
  'ui.prev': 'Précédente',
  'ui.next': 'Suivante',
  'ui.reps': 'Répétitions',
  'ui.doneLabel': 'Avancement',
  'ui.done': 'Étape terminée',
  'ui.timer': 'Session',
  'ui.mats': 'Matériel',
  'ui.empty':
    'Collez ou écrivez votre pattern ci-dessus, puis « Découper en étapes ». Vous pourrez ensuite avancer aux flèches ← → ou à la barre d’espace.',
  'ui.repeat': 'Répétition',
  'ui.allSteps': 'étapes en tout',
  'ui.reset': 'Remettre à zéro',
  'ui.stepsIn': 'dans cette pièce',
  'ui.pieces': 'Pièces',
  'ui.loaded': 'étapes découpées',
  'ui.noPattern': 'aucun pattern chargé',
  'ui.play': 'Démarrer le chronomètre',
  'ui.pause': 'Mettre le chronomètre en pause',
  'ui.pdfOpen': 'Ouvrir un PDF',
  'ui.pdfLoading': 'Lecture du PDF…',
  'ui.pdfEmpty':
    'Ce PDF ressemble à une image scannée : le texte ne peut pas en être extrait. Collez le texte du pattern ci-dessus à la place.',
  'ui.pdfError': "Ce PDF n'a pas pu être lu. Collez le texte du pattern ci-dessus à la place.",
  'ui.expand': 'Développer les abréviations',
  'ui.abbrev': 'Abréviations',
  'ui.cancel': 'Annuler',
  'ui.copyLink': 'Copier le lien',
  'ui.linkCopied': 'Lien copié dans le presse-papiers.',
  'ui.linkCopyFailed':
    'Impossible de copier automatiquement. Copiez l’adresse de la page depuis la barre du navigateur.',
  'ui.linkTooLong':
    'Ce patron est trop long pour tenir dans un lien. Partagez-le en texte à la place.',
  'ui.linkImportTitle': 'Ouvrir ce patron partagé ?',
  'ui.linkImportBody':
    "Un patron est déjà en cours. L'ouvrir depuis ce lien remplace l'affichage actuel — le projet en cours reste enregistré dans « Mes projets ».",
  'ui.linkImportAction': 'Ouvrir le patron du lien',
} as const;

export type ReaderTranslationKey = keyof typeof FR;

const EN: Record<ReaderTranslationKey, string> = {
  'ui.import': 'The pattern',
  'ui.paste': 'Pattern text',
  'ui.placeholder':
    'Round 1: 6 sc in a magic ring (6)\nRound 2: inc in each st around (12)\nRounds 3-6: sc in each st around (12)',
  'ui.load': 'Split into steps',
  'ui.demo': 'Example',
  'ui.clear': 'Clear',
  'ui.prev': 'Previous',
  'ui.next': 'Next',
  'ui.reps': 'Repeats',
  'ui.doneLabel': 'Progress',
  'ui.done': 'Step done',
  'ui.timer': 'Session',
  'ui.mats': 'Materials',
  'ui.empty':
    'Paste or type your pattern above, then “Split into steps”. After that, move with ← → or the space bar.',
  'ui.repeat': 'Repeat',
  'ui.allSteps': 'steps in total',
  'ui.reset': 'Reset',
  'ui.stepsIn': 'in this piece',
  'ui.pieces': 'Pieces',
  'ui.loaded': 'steps found',
  'ui.noPattern': 'no pattern loaded',
  'ui.play': 'Start the timer',
  'ui.pause': 'Pause the timer',
  'ui.pdfOpen': 'Open a PDF',
  'ui.pdfLoading': 'Reading the PDF…',
  'ui.pdfEmpty':
    "This PDF looks like a scanned image: its text can't be extracted. Paste the pattern text above instead.",
  'ui.pdfError': "This PDF couldn't be read. Paste the pattern text above instead.",
  'ui.expand': 'Spell out abbreviations',
  'ui.abbrev': 'Abbreviations',
  'ui.cancel': 'Cancel',
  'ui.copyLink': 'Copy link',
  'ui.linkCopied': 'Link copied to clipboard.',
  'ui.linkCopyFailed': 'Could not copy automatically. Copy the page address from the browser bar.',
  'ui.linkTooLong': 'This pattern is too long to fit in a link. Share it as text instead.',
  'ui.linkImportTitle': 'Open this shared pattern?',
  'ui.linkImportBody':
    'A pattern is already open. Opening this link replaces the current view — the current project stays saved in “My projects”.',
  'ui.linkImportAction': 'Open the pattern from the link',
};

export const READER_COPY: Record<Locale, Record<ReaderTranslationKey, string>> = { fr: FR, en: EN };
