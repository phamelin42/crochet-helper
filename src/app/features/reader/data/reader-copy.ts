import { Locale } from '../../../core/i18n/locale';

/**
 * Textes propres à la page du lecteur et à ses composants. Ils vivent ici
 * plutôt que dans le dictionnaire global (`core/i18n/translations.ts`) pour
 * rester dans le chunk paresseux de la page : le dictionnaire global fait
 * partie du bundle initial (budget 320 kB).
 */
const FR = {
  'ui.import': 'Le patron',
  'ui.paste': 'Texte du patron',
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
    'Collez ou écrivez votre patron ci-dessus, puis « Découper en étapes ». Vous pourrez ensuite avancer aux flèches ← → ou à la barre d’espace.',
  'ui.allSteps': 'étapes en tout',
  'ui.reset': 'Remettre à zéro',
  'ui.pieces': 'Pièces',
  'ui.loaded': 'étapes découpées',
  'ui.noPattern': 'aucun patron chargé',
  'ui.play': 'Démarrer le chronomètre',
  'ui.pause': 'Mettre le chronomètre en pause',
  'ui.pdfOpen': 'Ouvrir un PDF',
  'ui.pdfLoading': 'Lecture du PDF…',
  'ui.pdfEmpty':
    'Ce PDF ressemble à une image scannée : le texte ne peut pas en être extrait. Collez le texte du patron ci-dessus à la place.',
  'ui.pdfError': "Ce PDF n'a pas pu être lu. Collez le texte du patron ci-dessus à la place.",
  'ui.noRows':
    'Aucun rang numéroté trouvé. Pattern Reader crée une étape par rang ou tour numéroté (« Rang 1 : », « Tour 2 : », « 1. »). Un patron rédigé en paragraphes ne peut pas encore être découpé ; un patron donné en diagramme s’ouvre avec « Ouvrir un diagramme ».',
  'ui.emptyText': 'Rien à découper pour le moment : collez d’abord le texte de votre patron.',
  'ui.aiLabel': 'Remettre en forme avec une IA (Claude) — 3 fois par jour',
  'ui.aiHelp':
    'Le texte du patron est envoyé à Anthropic pour être remis en forme, puis découpé ici. Anthropic ne s’en sert pas pour entraîner ses modèles.',
  'ui.aiPrivacy': 'Confidentialité',
  'ui.aiBusy': 'Mise en forme en cours… (jusqu’à une minute)',
  'ui.aiDone': 'Remis en forme par IA — il vous en reste {n} aujourd’hui.',
  'ui.aiDoneShort': 'Remis en forme par IA.',
  'ui.aiRevert': 'Revenir au texte d’origine',
  'ui.aiRevertTitle': 'Revenir au texte d’origine ?',
  'ui.aiRevertBody':
    'Le patron reprend son texte d’origine, découpé par l’outil habituel. Votre progression repart de zéro.',
  'ui.aiDay':
    'Vous avez utilisé vos 3 mises en forme par IA d’aujourd’hui ; le patron est découpé par l’outil habituel.',
  'ui.aiMonth':
    'Les mises en forme par IA de ce mois sont épuisées ; le patron est découpé par l’outil habituel.',
  'ui.aiFailed':
    'La mise en forme par IA n’a pas abouti ; le patron est découpé par l’outil habituel.',
  'ui.aiTooLong':
    'Ce patron est trop long pour la mise en forme par IA ; il est découpé par l’outil habituel.',
  'ui.aiNetwork':
    'Le service d’IA n’a pas pu être joint (connexion, bloqueur de publicités, site ouvert depuis une autre adresse que patternreader.com, ou service arrêté) ; le patron est découpé par l’outil habituel.',
  'ui.aiSlow':
    'Le service d’IA a mis plus d’une minute à répondre ; le patron est découpé par l’outil habituel.',
  'ui.aiShort':
    'L’IA a supprimé trop de texte : sa version est écartée pour ne perdre aucun rang ; le patron est découpé par l’outil habituel.',
  'ui.aiNumbers':
    'L’IA a changé des nombres (mailles ou rangs) : sa version est écartée ; le patron est découpé par l’outil habituel.',
  'ui.aiIncomplete':
    'L’IA n’a pas rendu un texte complet ; le patron est découpé par l’outil habituel.',
  'ui.aiDown':
    'Le service d’IA est momentanément hors service ; le patron est découpé par l’outil habituel.',
  'ui.aiCode': 'Code technique :',
  'ui.aiSorry':
    'Malheureusement, utiliser une IA n’est pas gratuit, et je ne souhaite pas dépenser plus de 10 € par mois pour ce site pour le moment. Désolé…',
  'ui.aiAsk':
    'Si, à l’avenir, vous voulez plus d’utilisations et seriez prête à en payer une partie,',
  'ui.aiAskLink': 'faites-le-moi savoir',
  'ui.aiAskEnd': ' !',
  'ui.clearConfirmTitle': 'Effacer ce patron de l’écran ?',
  'ui.clearConfirmBody':
    'Le patron quitte l’écran. Il reste enregistré dans « Mes projets », où vous pourrez le reprendre.',
  'ui.clearConfirmAction': 'Effacer de l’écran',
  'ui.cancel': 'Annuler',
  'ui.copyPatternLink': 'Partager le patron',
  'ui.linkCopied': 'Lien copié dans le presse-papiers.',
  'ui.linkCopyFailed':
    'Impossible de copier automatiquement. Copiez l’adresse de la page depuis la barre du navigateur.',
  'ui.linkTooLong':
    'Ce patron est trop long pour tenir dans un lien. Partagez-le en texte à la place.',
  'ui.linkImportTitle': 'Ouvrir ce patron partagé ?',
  'ui.linkImportBody':
    "Un patron est déjà en cours. L'ouvrir depuis ce lien remplace l'affichage actuel — le projet en cours reste enregistré dans « Mes projets ».",
  'ui.linkImportAction': 'Ouvrir le patron du lien',
  'ui.waitlistText': 'Une version synchronisée entre vos appareils, 29 € par an — intéressée ?',
  'ui.waitlistLink': 'En savoir plus',
  'ui.waitlistHide': 'Masquer',
  'ui.textSize': 'Taille du texte',
  'ui.focusOff': 'Quitter la page pleine',
  'ui.finished': 'Patron terminé, bravo ! Le chronomètre est arrêté.',
  'ui.repsDone': 'Répétitions terminées',
  'ui.focusOn': 'Page pleine',
  'ui.textSizeBase': 'A',
  'ui.textSizeLg': 'A+',
  'ui.textSizeXl': 'A++',
  'ui.changePattern': 'Changer de patron',
  'ui.stepOf': 'Étape',
  'ui.view': 'Affichage',
  'ui.viewText': 'Texte',
  'ui.viewChart': 'Diagramme',
  'ui.viewChartOff':
    'Le diagramme n’est pas disponible : aucune étape de cette pièce ne se lit comme un tour de mailles.',
  'ui.viewFallback':
    'Ce patron est affiché en étapes écrites : aucune étape ne se lit comme un tour de mailles à dessiner.',
  'ui.stitchOf': 'maille',
  'ui.stitchTotal': 'sur',
  'ui.print': 'Imprimer',
  'ui.photo': 'Photo',
  'ui.stepPhotos': 'Photos de l’étape',
  'ui.patternPhotos': 'Photos du patron',
  'ui.photoPrev': 'Précédente',
  'ui.photoNext': 'Suivante',
  'ui.photoClose': 'Fermer',
  'ui.photosTruncated':
    'Ce PDF contient beaucoup de photos : seules les premières ont été gardées (40 au plus, 20 Mo en tout).',
  'ui.photosNotSaved':
    'Les photos de ce PDF n’ont pas pu être enregistrées : l’espace de stockage de l’appareil est plein. Le patron est bien là, sans ses photos.',
  'ui.chartOpen': 'Ouvrir un diagramme',
  'ui.gridOpen': 'Ouvrir une image en grille',
  'ui.chartBusy': 'Lecture du diagramme…',
  'ui.chartErrorFormat':
    'Ce fichier n’est pas un diagramme lisible : choisissez une image PNG, JPEG ou WebP, ou un PDF.',
  'ui.chartErrorHeavy':
    'Ce fichier est trop lourd : 10 Mo au plus pour une image, 30 Mo pour un PDF.',
  'ui.chartErrorUnreadable': 'Cette image n’a pas pu être lue.',
  'ui.chartErrorPdf': 'Les pages de ce PDF n’ont pas pu être lues.',
  'ui.gridNotSaved':
    'La grille n’a pas pu être enregistrée : l’espace de stockage de l’appareil est plein.',
  'ui.chartOf': 'Diagramme',
  'ui.chartControls': 'Commandes du diagramme',
  'ui.chartZoomIn': 'Zoom +',
  'ui.chartZoomOut': 'Zoom −',
  'ui.chartFit': 'Ajuster',
  'ui.chartRotate': 'Tourner',
  'ui.chartFullscreen': 'Plein écran',
  'ui.chartPdfTitle': 'Quelles pages contiennent un diagramme ?',
  'ui.chartPdfHint': '10 pages au plus. Cochez celles à garder.',
  'ui.chartPdfTruncated': 'Ce PDF est long : seules ses 60 premières pages sont proposées.',
  'ui.chartPage': 'Page',
  'ui.chartPdfAdd': 'Lire les pages cochées',
  'ui.chartCancel': 'Annuler',
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
  'ui.allSteps': 'steps in total',
  'ui.reset': 'Reset',
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
  'ui.noRows':
    'No numbered rows found. Pattern Reader makes one step per numbered row or round (“Row 1:”, “Rnd 2:”, “1.”). A pattern written as paragraphs can’t be split yet; a pattern given as a chart opens with “Open a chart”.',
  'ui.emptyText': 'Nothing to split yet: paste your pattern text first.',
  'ui.aiLabel': 'Tidy up with AI (Claude) — 3 times a day',
  'ui.aiHelp':
    'The pattern text is sent to Anthropic to be tidied up, then split into steps here. Anthropic doesn’t train its models on it.',
  'ui.aiPrivacy': 'Privacy',
  'ui.aiBusy': 'Tidying up… (up to a minute)',
  'ui.aiDone': 'Tidied up by AI — you have {n} left today.',
  'ui.aiDoneShort': 'Tidied up by AI.',
  'ui.aiRevert': 'Go back to the original text',
  'ui.aiRevertTitle': 'Go back to the original text?',
  'ui.aiRevertBody':
    'The pattern goes back to its original text, split by the usual tool. Your progress starts over.',
  'ui.aiDay': 'You’ve used your 3 AI tidy-ups for today; the pattern is split by the usual tool.',
  'ui.aiMonth': 'This month’s AI tidy-ups are used up; the pattern is split by the usual tool.',
  'ui.aiFailed': 'The AI tidy-up didn’t work out; the pattern is split by the usual tool.',
  'ui.aiTooLong': 'This pattern is too long for the AI tidy-up; it is split by the usual tool.',
  'ui.aiNetwork':
    'The AI service couldn’t be reached (connection, ad blocker, site opened from an address other than patternreader.com, or service down); the pattern is split by the usual tool.',
  'ui.aiSlow':
    'The AI service took more than a minute to answer; the pattern is split by the usual tool.',
  'ui.aiShort':
    'The AI removed too much text: its version is set aside so no row is lost; the pattern is split by the usual tool.',
  'ui.aiNumbers':
    'The AI changed some numbers (stitches or rows): its version is set aside; the pattern is split by the usual tool.',
  'ui.aiIncomplete':
    'The AI didn’t return a complete text; the pattern is split by the usual tool.',
  'ui.aiDown':
    'The AI service is temporarily out of order; the pattern is split by the usual tool.',
  'ui.aiCode': 'Technical code:',
  'ui.aiSorry':
    'Unfortunately, using AI isn’t free, and for now I don’t want to spend more than €10 a month on this site. Sorry…',
  'ui.aiAsk': 'If you’d like more uses in the future and would be willing to pay part of it,',
  'ui.aiAskLink': 'let me know',
  'ui.aiAskEnd': '!',
  'ui.clearConfirmTitle': 'Clear this pattern from the screen?',
  'ui.clearConfirmBody':
    'The pattern leaves the screen. It stays saved in “My projects”, where you can resume it.',
  'ui.clearConfirmAction': 'Clear from the screen',
  'ui.cancel': 'Cancel',
  'ui.copyPatternLink': 'Share this pattern',
  'ui.linkCopied': 'Link copied to clipboard.',
  'ui.linkCopyFailed': 'Could not copy automatically. Copy the page address from the browser bar.',
  'ui.linkTooLong': 'This pattern is too long to fit in a link. Share it as text instead.',
  'ui.linkImportTitle': 'Open this shared pattern?',
  'ui.linkImportBody':
    'A pattern is already open. Opening this link replaces the current view — the current project stays saved in “My projects”.',
  'ui.linkImportAction': 'Open the pattern from the link',
  'ui.waitlistText': 'A version that syncs between devices for €29/year — interested?',
  'ui.waitlistLink': 'Tell me more',
  'ui.waitlistHide': 'Hide',
  'ui.textSize': 'Text size',
  'ui.focusOff': 'Exit full page',
  'ui.finished': 'Pattern finished, well done! The timer is stopped.',
  'ui.repsDone': 'Repeats complete',
  'ui.focusOn': 'Full page',
  'ui.textSizeBase': 'A',
  'ui.textSizeLg': 'A+',
  'ui.textSizeXl': 'A++',
  'ui.changePattern': 'Change pattern',
  'ui.stepOf': 'Step',
  'ui.view': 'View',
  'ui.viewText': 'Text',
  'ui.viewChart': 'Chart',
  'ui.viewChartOff':
    'The chart is not available: no step of this piece reads as a round of stitches.',
  'ui.viewFallback':
    'This pattern is shown as written steps: no step reads as a round of stitches to draw.',
  'ui.stitchOf': 'stitch',
  'ui.stitchTotal': 'of',
  'ui.print': 'Print',
  'ui.photo': 'Photo',
  'ui.stepPhotos': 'Photos for this step',
  'ui.patternPhotos': 'Pattern photos',
  'ui.photoPrev': 'Previous',
  'ui.photoNext': 'Next',
  'ui.photoClose': 'Close',
  'ui.photosTruncated':
    'This PDF has a lot of photos: only the first ones were kept (up to 40, 20 MB in total).',
  'ui.photosNotSaved':
    'This PDF’s photos couldn’t be saved: the device storage is full. The pattern is here, without its photos.',
  'ui.chartOpen': 'Open a chart',
  'ui.gridOpen': 'Open an image as a grid',
  'ui.chartBusy': 'Reading the chart…',
  'ui.chartErrorFormat':
    'This file isn’t a readable chart: choose a PNG, JPEG or WebP image, or a PDF.',
  'ui.chartErrorHeavy': 'This file is too large: 10 MB at most for an image, 30 MB for a PDF.',
  'ui.chartErrorUnreadable': 'This image couldn’t be read.',
  'ui.chartErrorPdf': 'The pages of this PDF couldn’t be read.',
  'ui.gridNotSaved': 'The grid couldn’t be saved: the device storage is full.',
  'ui.chartOf': 'Chart',
  'ui.chartControls': 'Chart controls',
  'ui.chartZoomIn': 'Zoom +',
  'ui.chartZoomOut': 'Zoom −',
  'ui.chartFit': 'Fit',
  'ui.chartRotate': 'Rotate',
  'ui.chartFullscreen': 'Full screen',
  'ui.chartPdfTitle': 'Which pages hold a chart?',
  'ui.chartPdfHint': 'Up to 10 pages. Tick the ones to keep.',
  'ui.chartPdfTruncated': 'This PDF is long: only its first 60 pages are offered.',
  'ui.chartPage': 'Page',
  'ui.chartPdfAdd': 'Read the ticked pages',
  'ui.chartCancel': 'Cancel',
};

export const READER_COPY: Record<Locale, Record<ReaderTranslationKey, string>> = { fr: FR, en: EN };
