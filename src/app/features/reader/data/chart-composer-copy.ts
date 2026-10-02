import { Locale } from '../../../core/i18n/locale';

/**
 * Textes du composeur de transcription : hors de `reader-copy.ts`, que le
 * dictionnaire global embarque dans le bundle initial.
 */
const FR = {
  'ui.composeOpen': 'Transcrire ce diagramme',
  'ui.composeTitle': 'Transcrire le diagramme en texte',
  'ui.composePalette': 'Symboles',
  'ui.composeConvention': 'Convention',
  'ui.composeKind': 'Type de ligne',
  'ui.composeKindRound': 'Tour',
  'ui.composeKindRow': 'Rang',
  'ui.composeInto': 'Début',
  'ui.composeIntoNone': 'Aucun',
  'ui.composeIntoRing': 'Cercle magique',
  'ui.composeIntoChain': 'Chaînette',
  'ui.composeCurrent': 'Tour en cours',
  'ui.composeHint': 'Touchez un symbole pour l’ajouter. Touchez-le encore pour en ajouter un.',
  'ui.composeRepeat': 'Répéter la sélection ×',
  'ui.composeRepeatDo': 'Répéter',
  'ui.composeFinish': 'Terminer le tour',
  'ui.composeRemoveToken': 'Retirer',
  'ui.composeRounds': 'Tours écrits',
  'ui.composeNoRounds': 'Aucun tour écrit pour le moment.',
  'ui.composeRemoveRound': 'Retirer le tour',
  'ui.composeStitches': 'mailles',
  'ui.composeName': 'Nom de la pièce',
  'ui.composeAdd': 'Ajouter au patron',
  'ui.composeDefaultName': 'Diagramme',
  'ui.composeWarnEmpty': 'Le tour {n} est vide.',
  'ui.composeWarnJump':
    'Le tour {n} a moins de la moitié ou plus du double des mailles du précédent.',
  'ui.composeWarnRepeat':
    'Dans le tour {n}, la répétition ne tombe pas juste sur le tour précédent.',
  'ui.composeOpenTitle': 'Relire le diagramme lu',
  'ui.composeOpenIntro':
    'Fil a lu ce diagramme automatiquement. Comparez chaque tour à l’image, corrigez ce qui ne va pas, puis découpez en étapes.',
  'ui.composeOpenUncertain':
    '{n} symbole(s) lu(s) avec peu de certitude : vérifiez-les en premier.',
  'ui.composeOpenNothing':
    'Aucun symbole n’a pu être lu sur cette image. Transcrivez-la en touchant les symboles ci-dessous.',
  'ui.composeOpenAdd': 'Découper en étapes',
  'ui.composeEditRound': 'Modifier le tour',
  'ui.composeAddRound': 'Ajouter un tour',
  'ui.composeEditing': 'Tour {n} en cours de modification',
};

export type ComposerKey = keyof typeof FR;

const EN: Record<ComposerKey, string> = {
  'ui.composeOpen': 'Transcribe this chart',
  'ui.composeTitle': 'Transcribe the chart into text',
  'ui.composePalette': 'Symbols',
  'ui.composeConvention': 'Convention',
  'ui.composeKind': 'Line type',
  'ui.composeKindRound': 'Round',
  'ui.composeKindRow': 'Row',
  'ui.composeInto': 'Start',
  'ui.composeIntoNone': 'None',
  'ui.composeIntoRing': 'Magic ring',
  'ui.composeIntoChain': 'Chain',
  'ui.composeCurrent': 'Current round',
  'ui.composeHint': 'Tap a symbol to add it. Tap it again to add another one.',
  'ui.composeRepeat': 'Repeat the selection ×',
  'ui.composeRepeatDo': 'Repeat',
  'ui.composeFinish': 'Finish the round',
  'ui.composeRemoveToken': 'Remove',
  'ui.composeRounds': 'Rounds written',
  'ui.composeNoRounds': 'No round written yet.',
  'ui.composeRemoveRound': 'Remove the round',
  'ui.composeStitches': 'stitches',
  'ui.composeName': 'Piece name',
  'ui.composeAdd': 'Add to the pattern',
  'ui.composeDefaultName': 'Chart',
  'ui.composeWarnEmpty': 'Round {n} is empty.',
  'ui.composeWarnJump': 'Round {n} has less than half or more than double the previous stitches.',
  'ui.composeWarnRepeat': 'In round {n}, the repeat does not fit the previous round.',
  'ui.composeOpenTitle': 'Check the chart reading',
  'ui.composeOpenIntro':
    'Fil read this chart automatically. Compare each round with the picture, fix what is wrong, then split into steps.',
  'ui.composeOpenUncertain': '{n} symbol(s) read with low confidence: check them first.',
  'ui.composeOpenNothing':
    'No symbol could be read in this picture. Transcribe it by tapping the symbols below.',
  'ui.composeOpenAdd': 'Split into steps',
  'ui.composeEditRound': 'Edit the round',
  'ui.composeAddRound': 'Add a round',
  'ui.composeEditing': 'Editing round {n}',
};

export const COMPOSER_COPY: Record<Locale, Record<ComposerKey, string>> = { fr: FR, en: EN };
