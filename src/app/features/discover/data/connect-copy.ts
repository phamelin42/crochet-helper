import { SITE_NAME } from '../../../core/seo/site';
import type { Locale } from '../../../core/i18n/locale';

const nbsp = ' ';

/**
 * Textes de la connexion à Ravelry (fiche 62) : écran de connexion, état
 * connecté, galerie des ouvrages, page de retour. Dans le morceau paresseux des
 * pages, jamais dans `translations.ts` (bundle initial).
 */
export interface ConnectCopy {
  readonly loginTitle: string;
  readonly loginWhy: string;
  readonly seesTitle: string;
  readonly sees: string;
  readonly neverTitle: string;
  readonly never: string;
  readonly connect: string;
  readonly connecting: string;
  readonly unavailable: string;
  readonly createAccount: string;
  readonly newTab: string;
  readonly checking: string;
  readonly connected: string;
  readonly disconnect: string;
  readonly disconnected: string;
  readonly expired: string;
  readonly reconnect: string;
  readonly settingsTitle: string;
  readonly settingsIntro: string;
  readonly galleryTitle: string;
  readonly galleryLoading: string;
  readonly galleryEmpty: string;
  readonly galleryLogin: string;
  readonly galleryMore: string;
  readonly galleryMoreLoading: string;
  readonly galleryError: string;
  readonly projectPhoto: (n: number) => string;
  readonly projectLink: string;
  readonly projectLinkHidden: (n: number) => string;
  readonly callbackTitle: string;
  readonly callbackDescription: string;
  readonly callbackProgress: string;
  readonly callbackFailures: {
    readonly state: string;
    readonly denied: string;
    readonly failed: string;
    readonly unavailable: string;
    readonly off: string;
  };
  readonly callbackRetry: string;
  readonly callbackBack: string;
}

export const CONNECT_COPY: Record<Locale, ConnectCopy> = {
  fr: {
    loginTitle: 'Se connecter avec Ravelry',
    loginWhy:
      'Ravelry demande que ses patrons et leurs photos ne soient montrés qu’à des personnes qui ont un compte Ravelry. C’est une règle de Ravelry, pas la nôtre.',
    seesTitle: `Ce que ${SITE_NAME} peut voir`,
    sees: 'Seulement de quoi lire : les patrons gratuits et leurs photos.',
    neverTitle: `Ce que ${SITE_NAME} ne fait pas`,
    never:
      'Il ne publie rien, ne lit pas vos messages et ne garde aucune de vos données sur un serveur. Votre connexion reste sur cet appareil.',
    connect: 'Se connecter avec Ravelry',
    connecting: 'Redirection vers Ravelry…',
    unavailable: 'La connexion à Ravelry n’est pas disponible pour le moment.',
    createAccount: 'Créer un compte Ravelry gratuit',
    newTab: '(nouvel onglet)',
    checking: 'Vérification de votre connexion…',
    connected: 'Connectée à Ravelry',
    disconnect: 'Se déconnecter de Ravelry',
    disconnected:
      'Vous êtes déconnectée de Ravelry : la connexion est effacée de cet appareil. Pour retirer aussi l’accès de Pattern Reader, ouvrez les réglages de votre compte Ravelry.',
    expired: 'Votre connexion à Ravelry a expiré.',
    reconnect: 'Se reconnecter',
    settingsTitle: 'Ravelry',
    settingsIntro:
      'La recherche de patrons passe par votre compte Ravelry, en lecture seule. Le jeton de connexion reste sur cet appareil.',
    galleryTitle: 'Ouvrages réalisés avec ce patron',
    galleryLoading: 'Chargement des ouvrages…',
    galleryEmpty: 'Personne n’a encore partagé d’ouvrage.',
    galleryLogin: 'Se connecter pour voir les ouvrages réalisés',
    galleryMore: 'Voir plus d’ouvrages',
    galleryMoreLoading: 'Chargement…',
    galleryError: 'Les ouvrages n’ont pas pu être chargés pour le moment.',
    projectPhoto: (n) => `Ouvrage réalisé avec ce patron, photo ${n}`,
    projectLink: 'Voir sur Ravelry',
    projectLinkHidden: (n) => `, ouvrage ${n} (nouvel onglet)`,
    callbackTitle: `Connexion à Ravelry — ${SITE_NAME}`,
    callbackDescription: 'Retour de la connexion à Ravelry.',
    callbackProgress: 'Connexion à Ravelry en cours…',
    callbackFailures: {
      state: 'La connexion n’a pas pu être vérifiée, réessayez.',
      denied: `Vous avez refusé l’accès${nbsp}: rien n’a été partagé.`,
      failed: 'Ravelry n’a pas accepté la connexion, réessayez.',
      unavailable:
        'Le service de connexion ne répond pas pour le moment, réessayez dans un instant.',
      off: 'La connexion à Ravelry n’est pas disponible pour le moment.',
    },
    callbackRetry: 'Réessayer',
    callbackBack: 'Retour à la recherche de patrons',
  },
  en: {
    loginTitle: 'Connect with Ravelry',
    loginWhy:
      'Ravelry asks that its patterns and their photos are only shown to people who have a Ravelry account. That is Ravelry’s rule, not ours.',
    seesTitle: `What ${SITE_NAME} can see`,
    sees: 'Read-only access: free patterns and their photos.',
    neverTitle: `What ${SITE_NAME} does not do`,
    never:
      'It does not post anything, does not read your messages and does not keep any of your data on a server. Your connection stays on this device.',
    connect: 'Connect with Ravelry',
    connecting: 'Redirecting to Ravelry…',
    unavailable: 'Connecting to Ravelry is not available right now.',
    createAccount: 'Create a free Ravelry account',
    newTab: '(opens in a new tab)',
    checking: 'Checking your connection…',
    connected: 'Connected to Ravelry',
    disconnect: 'Disconnect from Ravelry',
    disconnected:
      'You are disconnected from Ravelry: the connection is erased from this device. To also remove Pattern Reader’s access, open your Ravelry account settings.',
    expired: 'Your connection to Ravelry has expired.',
    reconnect: 'Reconnect',
    settingsTitle: 'Ravelry',
    settingsIntro:
      'Pattern search goes through your Ravelry account, read-only. The connection token stays on this device.',
    galleryTitle: 'Projects made with this pattern',
    galleryLoading: 'Loading projects…',
    galleryEmpty: 'Nobody has shared a project yet.',
    galleryLogin: 'Connect to see projects made with this pattern',
    galleryMore: 'Show more projects',
    galleryMoreLoading: 'Loading…',
    galleryError: 'The projects could not be loaded right now.',
    projectPhoto: (n) => `Project made with this pattern, photo ${n}`,
    projectLink: 'View on Ravelry',
    projectLinkHidden: (n) => `, project ${n} (opens in a new tab)`,
    callbackTitle: `Connecting to Ravelry — ${SITE_NAME}`,
    callbackDescription: 'Return from connecting to Ravelry.',
    callbackProgress: 'Connecting to Ravelry…',
    callbackFailures: {
      state: 'The connection could not be verified, please try again.',
      denied: 'You declined access: nothing was shared.',
      failed: 'Ravelry did not accept the connection, please try again.',
      unavailable:
        'The connection service is not answering right now, please try again in a moment.',
      off: 'Connecting to Ravelry is not available right now.',
    },
    callbackRetry: 'Try again',
    callbackBack: 'Back to pattern search',
  },
};

/** Page de création de compte : la page d'accueil de Ravelry, qui propose de s'inscrire (adresse exacte non lue dans la doc : à confirmer). */
export const RAVELRY_JOIN_URL = 'https://www.ravelry.com/';
