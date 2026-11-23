import { SITE_NAME } from '../../../core/seo/site';
import type { RavelryRefusal } from '../../../core/ravelry/ravelry.model';
import type { Locale } from '../../../core/i18n/locale';

/**
 * Textes des pages de recherche et de favoris. Ils vivent ici, dans le morceau
 * paresseux des pages, et non dans `translations.ts` (bundle initial).
 */
export interface DiscoverCopy {
  readonly title: string;
  readonly description: string;
  readonly h1: string;
  readonly intro: string;
  readonly soon: string;
  readonly soonHome: string;
  readonly fieldLabel: string;
  readonly placeholder: string;
  readonly tip: string;
  readonly craftLabel: string;
  readonly crochet: string;
  readonly knitting: string;
  readonly search: string;
  readonly needTerm: string;
  readonly loading: string;
  readonly resultsFor: (q: string) => string;
  readonly found: (n: number) => string;
  readonly none: (q: string) => string;
  readonly retry: string;
  readonly more: string;
  readonly moreLoading: string;
  readonly refusal: (raison: RavelryRefusal, waitSeconds: number | null) => string;
  readonly free: string;
  readonly by: (designer: string) => string;
  readonly note: string;
  readonly back: string;
  readonly backToSearch: string;
  readonly detailLoading: string;
  readonly detailRefusal: (raison: RavelryRefusal) => string;
  readonly seeOnRavelry: string;
  readonly newTab: string;
  readonly craft: string;
  readonly yarnWeight: string;
  readonly difficulty: string;
  readonly descriptionTitle: string;
  readonly noDescription: string;
  readonly howTitle: string;
  readonly how: string;
  readonly start: string;
  readonly addFavorite: string;
  readonly removeFavorite: string;
  readonly added: string;
  readonly removed: string;
  readonly saveFailed: string;
  readonly photo: (i: number, n: number, name: string) => string;
  readonly photosOf: (name: string) => string;
  readonly favTitle: string;
  readonly favDescription: string;
  readonly favH1: string;
  readonly favIntro: string;
  readonly favEmpty: string;
  readonly favSearch: string;
  readonly favLoading: string;
  readonly favCount: (n: number) => string;
  readonly remove: string;
  readonly removeOne: (name: string) => string;
  readonly removeTitle: string;
  readonly removeBody: (name: string) => string;
  readonly removeAll: string;
  readonly removeAllTitle: string;
  readonly removeAllBody: (n: number) => string;
  readonly cancel: string;
  readonly favoritesLink: string;
}

const nbsp = ' ';

export const DISCOVER_COPY: Record<Locale, DiscoverCopy> = {
  fr: {
    title: `Rechercher un patron gratuit — ${SITE_NAME}`,
    description:
      'Cherchez un patron de crochet ou de tricot gratuit, mettez-le de côté et commencez-le dans le lecteur.',
    h1: 'Rechercher un patron',
    intro:
      'Cherchez un patron gratuit de crochet ou de tricot. Les résultats viennent de Ravelry ; vos favoris restent sur cet appareil, sans compte.',
    soon: 'Cette page arrive bientôt : vous pourrez y chercher un patron gratuit de crochet ou de tricot, le mettre de côté et le commencer dans le lecteur.',
    soonHome: 'Retour à l’accueil',
    fieldLabel: `Que voulez-vous crocheter ou tricoter${nbsp}?`,
    placeholder: 'sapin de Noël',
    tip: `Astuce${nbsp}: la plupart des patrons sont décrits en anglais (« christmas tree »).`,
    craftLabel: 'Technique',
    crochet: 'Crochet',
    knitting: 'Tricot',
    search: 'Rechercher',
    needTerm: 'Écrivez un mot à chercher, par exemple « sapin de Noël ».',
    loading: 'Recherche en cours…',
    resultsFor: (q) => `Résultats pour «${nbsp}${q}${nbsp}»`,
    found: (n) =>
      `${n} patron${n > 1 ? 's' : ''} gratuit${n > 1 ? 's' : ''} affiché${n > 1 ? 's' : ''}.`,
    none: (q) =>
      `Aucun patron gratuit trouvé pour «${nbsp}${q}${nbsp}». Essayez un mot plus simple, le même mot en anglais, ou l’autre technique.`,
    retry: 'Réessayer',
    more: 'Voir plus de patrons',
    moreLoading: 'Chargement…',
    refusal: (raison, wait) =>
      raison === 'reseau'
        ? 'La recherche n’a pas pu joindre le service. Vérifiez votre connexion.'
        : raison === 'delai'
          ? 'Le service met trop de temps à répondre.'
          : raison === 'trop-de-demandes'
            ? `Ravelry demande de patienter un peu.${wait ? ` Réessayez dans ${wait}${nbsp}s.` : ''}`
            : raison === 'quota-jour'
              ? 'Vous avez atteint le nombre de recherches possibles aujourd’hui. Revenez demain.'
              : raison === 'session-expiree' || raison === 'connexion-requise'
                ? 'Votre connexion à Ravelry a expiré. Reconnectez-vous pour continuer.'
                : 'Le service de recherche est indisponible pour le moment.',
    free: 'Gratuit',
    by: (designer) => `par ${designer}`,
    note: 'Pattern Reader n’est ni affilié à Ravelry ni approuvé par Ravelry. Données et photos : Ravelry et leurs auteurs.',
    back: 'Retour aux résultats',
    backToSearch: 'Rechercher un patron',
    detailLoading: 'Chargement du patron…',
    detailRefusal: (raison) =>
      raison === 'introuvable'
        ? 'Ce patron n’existe pas, ou n’est pas gratuit.'
        : raison === 'reseau'
          ? 'Le patron n’a pas pu être chargé. Vérifiez votre connexion.'
          : raison === 'delai'
            ? 'Le service met trop de temps à répondre.'
            : raison === 'trop-de-demandes'
              ? 'Ravelry demande de patienter un peu. Réessayez dans un instant.'
              : raison === 'quota-jour'
                ? 'Vous avez atteint le nombre de requêtes possibles aujourd’hui. Revenez demain.'
                : raison === 'session-expiree' || raison === 'connexion-requise'
                  ? 'Votre connexion à Ravelry a expiré. Reconnectez-vous pour continuer.'
                  : 'Le service est indisponible pour le moment.',
    seeOnRavelry: 'Voir sur Ravelry',
    newTab: '(nouvel onglet)',
    craft: 'Technique',
    yarnWeight: 'Poids de fil',
    difficulty: 'Difficulté (note moyenne sur Ravelry)',
    descriptionTitle: 'Description',
    noDescription: 'Ravelry ne donne pas de description pour ce patron.',
    howTitle: 'Comment le commencer',
    how: '« Commencer ce patron » ouvre la source du patron dans un nouvel onglet. Déposez son PDF ou collez son texte dans le lecteur : le projet garde le lien avec ce patron.',
    start: 'Commencer ce patron',
    addFavorite: 'Ajouter à mes favoris',
    removeFavorite: 'Retirer de mes favoris',
    added: 'Ajouté à vos favoris.',
    removed: 'Retiré de vos favoris.',
    saveFailed: 'Impossible d’enregistrer sur cet appareil (stockage plein ou refusé).',
    photo: (i, n, name) => `Photo ${i} sur ${n}, ${name}`,
    photosOf: (name) => `Photos de ${name}`,
    favTitle: `Mes favoris — ${SITE_NAME}`,
    favDescription: 'Les patrons mis de côté sur cet appareil.',
    favH1: 'Mes favoris',
    favIntro:
      'Les patrons mis de côté sont gardés sur cet appareil, sans compte. Ils s’affichent même sans connexion ; leurs photos reviennent avec le réseau.',
    favEmpty: 'Aucun favori pour l’instant.',
    favSearch: 'Rechercher un patron',
    favLoading: 'Chargement de vos favoris…',
    favCount: (n) => `${n} favori${n > 1 ? 's' : ''}.`,
    remove: 'Retirer',
    removeOne: (name) => `Retirer ${name} de mes favoris`,
    removeTitle: 'Retirer ce favori ?',
    removeBody: (name) =>
      `«${nbsp}${name}${nbsp}» ne sera plus dans vos favoris. Vous pourrez le remettre depuis la recherche.`,
    removeAll: 'Retirer tous mes favoris',
    removeAllTitle: 'Retirer tous vos favoris ?',
    removeAllBody: (n) =>
      `Les ${n} patron${n > 1 ? 's' : ''} seront retiré${n > 1 ? 's' : ''} de cet appareil. Cette action est définitive.`,
    cancel: 'Annuler',
    favoritesLink: 'Mes favoris',
  },
  en: {
    title: `Find a free pattern — ${SITE_NAME}`,
    description:
      'Search for a free crochet or knitting pattern, save it for later and start it in the reader.',
    h1: 'Find a pattern',
    intro:
      'Search for a free crochet or knitting pattern. Results come from Ravelry; your favourites stay on this device, no account needed.',
    soon: 'This page is coming soon: you will be able to search for a free crochet or knitting pattern, save it and start it in the reader.',
    soonHome: 'Back to the home page',
    fieldLabel: 'What do you want to crochet or knit?',
    placeholder: 'christmas tree',
    tip: 'Tip: try simple words, such as “christmas tree” or “baby blanket”.',
    craftLabel: 'Craft',
    crochet: 'Crochet',
    knitting: 'Knitting',
    search: 'Search',
    needTerm: 'Type something to look for, for example “christmas tree”.',
    loading: 'Searching…',
    resultsFor: (q) => `Results for “${q}”`,
    found: (n) => `${n} free pattern${n === 1 ? '' : 's'} shown.`,
    none: (q) => `No free pattern found for “${q}”. Try a simpler word, or the other craft.`,
    retry: 'Try again',
    more: 'Show more patterns',
    moreLoading: 'Loading…',
    refusal: (raison, wait) =>
      raison === 'reseau'
        ? 'The search could not reach the service. Check your connection.'
        : raison === 'delai'
          ? 'The service is taking too long to answer.'
          : raison === 'trop-de-demandes'
            ? `Ravelry asks you to wait a little.${wait ? ` Try again in ${wait} s.` : ''}`
            : raison === 'quota-jour'
              ? 'You have reached today’s search limit. Come back tomorrow.'
              : raison === 'session-expiree' || raison === 'connexion-requise'
                ? 'Your connection to Ravelry has expired. Reconnect to continue.'
                : 'The search service is unavailable right now.',
    free: 'Free',
    by: (designer) => `by ${designer}`,
    note: 'Pattern Reader is not affiliated with or endorsed by Ravelry. Data and photos: Ravelry and their authors.',
    back: 'Back to results',
    backToSearch: 'Find a pattern',
    detailLoading: 'Loading the pattern…',
    detailRefusal: (raison) =>
      raison === 'introuvable'
        ? 'This pattern does not exist, or is not free.'
        : raison === 'reseau'
          ? 'The pattern could not be loaded. Check your connection.'
          : raison === 'delai'
            ? 'The service is taking too long to answer.'
            : raison === 'trop-de-demandes'
              ? 'Ravelry asks you to wait a little. Try again in a moment.'
              : raison === 'quota-jour'
                ? 'You have reached today’s request limit. Come back tomorrow.'
                : raison === 'session-expiree' || raison === 'connexion-requise'
                  ? 'Your connection to Ravelry has expired. Reconnect to continue.'
                  : 'The service is unavailable right now.',
    seeOnRavelry: 'See on Ravelry',
    newTab: '(new tab)',
    craft: 'Craft',
    yarnWeight: 'Yarn weight',
    difficulty: 'Difficulty (average rating on Ravelry)',
    descriptionTitle: 'Description',
    noDescription: 'Ravelry gives no description for this pattern.',
    howTitle: 'How to start it',
    how: '“Start this pattern” opens the pattern’s source in a new tab. Drop its PDF or paste its text into the reader: the project keeps its link to this pattern.',
    start: 'Start this pattern',
    addFavorite: 'Add to my favourites',
    removeFavorite: 'Remove from my favourites',
    added: 'Added to your favourites.',
    removed: 'Removed from your favourites.',
    saveFailed: 'Could not save on this device (storage full or refused).',
    photo: (i, n, name) => `Photo ${i} of ${n}, ${name}`,
    photosOf: (name) => `Photos of ${name}`,
    favTitle: `My favourites — ${SITE_NAME}`,
    favDescription: 'The patterns you saved on this device.',
    favH1: 'My favourites',
    favIntro:
      'Saved patterns are kept on this device, no account needed. They show even without a connection; their photos come back with the network.',
    favEmpty: 'No favourites yet.',
    favSearch: 'Find a pattern',
    favLoading: 'Loading your favourites…',
    favCount: (n) => `${n} favourite${n === 1 ? '' : 's'}.`,
    remove: 'Remove',
    removeOne: (name) => `Remove ${name} from my favourites`,
    removeTitle: 'Remove this favourite?',
    removeBody: (name) =>
      `“${name}” will no longer be in your favourites. You can add it back from the search.`,
    removeAll: 'Remove all my favourites',
    removeAllTitle: 'Remove all your favourites?',
    removeAllBody: (n) =>
      `The ${n} pattern${n === 1 ? '' : 's'} will be removed from this device. This cannot be undone.`,
    cancel: 'Cancel',
    favoritesLink: 'My favourites',
  },
};
