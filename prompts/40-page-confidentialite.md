# 40 — Page de confidentialité

**Étape d'entonnoir servie : acquisition (le Play Store l'exige, fiche 41) et
activation (la confiance d'une lectrice qui colle un patron acheté).**

## Pourquoi

Google Play refuse une application sans **URL de politique de confidentialité**.
Le site n'en a pas : la seule mention est la ligne du pied de page (« Free, no
account. Your patterns stay on your device; only an anonymous audience
measurement is collected. »). C'est aussi un argument : rien ne quitte
l'appareil, et c'est rare.

## Objectif

Une page courte, en français et en anglais, qui dit exactement ce que fait
l'outil de vos données, **vérifiée contre le code**, pas écrite de mémoire.

## Fichiers à lire

- `src/app/core/i18n/route-paths.json` — déclarer `privacy`
  (`/privacy`, `/fr/confidentialite`) : l'audit axe et le sitemap en dérivent
- `docs/adr-001-mesure-audience.md` — ce que mesure Umami, et ce qu'il ne
  mesure pas
- `src/app/core/analytics/analytics.service.ts` — liste des événements et
  propriétés réellement envoyés
- `src/app/core/storage/` — ce qui va dans IndexedDB et `localStorage` (clés)
- `src/app/shared/layout/site-footer.ts` — lien à ajouter
- une page éditoriale existante comme modèle (`features/guides/pages/`), et
  `app.routes.ts` (`page()`)
- `docs/adr-002-comptes-et-paiement.md` §4 — pour ne **rien** promettre de
  contraire au futur compte payant

## À faire

1. Page `features/legal/pages/privacy-page.ts`, déclarée par `page()`
   (styles dans `pages.css`), pré-rendue, indexable, reliée depuis le pied
   de page (« Confidentialité » / « Privacy »).

2. Contenu, en phrases simples, chaque affirmation **vérifiée dans le code**
   (citer le fichier dans la PR) :
   - **Sur l'appareil seulement** : patrons, progression, photos, diagrammes
     (IndexedDB) ; préférences d'affichage et projet actif (`localStorage`).
     Rien n'est envoyé à un serveur ; pas de compte.
   - **Mesure d'audience** : Umami, sans cookie ni identifiant, hébergé en
     Europe (vérifier dans l'ADR 001). Ce qui part : page vue, pays, type
     d'appareil, et la liste exacte des événements (tirée de
     `AnalyticsEvent`). Jamais le texte d'un patron.
   - **Liens de partage** : le patron est dans le lien lui-même (`#p=`), qui
     ne passe pas par un serveur (le fragment n'est pas transmis).
   - **Liste d'attente** : si la lectrice laisse son adresse (formulaire
     Tally, fiche 22), dire où elle va et pour quoi faire.
   - **Supprimer ses données** : « Mes projets » → supprimer, ou effacer les
     données du site dans le navigateur.
   - **Contact** : l'adresse que Phil fournit (demander dans la PR s'il n'y en
     a pas dans le dépôt ; ne pas en inventer une).
   - Date de mise à jour.
3. Une phrase qui annonce la suite sans rien promettre : si une option payante
   de synchronisation arrive, cette page sera mise à jour avant.

## Tests

- e2e : le HTML brut de `/privacy` et `/fr/confidentialite` contient le titre,
  « IndexedDB » ou son équivalent en clair, et « Umami » ; le lien du pied de
  page mène à la page dans les deux langues.
- La page est dans le sitemap (indexable) et passe l'audit axe (dérivé de
  `route-paths.json`).
- Unitaire : la liste d'événements affichée est **générée** depuis la même
  source que `AnalyticsEvent` (ou vérifiée par un test qui les compare
  toutes), pour qu'un événement ajouté plus tard ne rende pas la page fausse.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé (page paresseuse).
- Aucune affirmation invérifiable ; la PR liste chaque affirmation et le
  fichier qui la prouve.
- Français soigné.

## Hors périmètre

Conditions d'utilisation, mentions légales, bandeau de consentement (aucun
n'est nécessaire aujourd'hui : ni cookie ni identifiant), traduction dans
d'autres langues.
