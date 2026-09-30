# 41 — Application Android sur le Play Store (TWA)

**Étape d'entonnoir servie : acquisition (la boutique est un canal de
recherche à part entière : « crochet row counter », « knitting pattern
reader ») et rétention (une icône sur l'écran d'accueil).**

## Pourquoi

Décision de Phil du 30 septembre : publier sur le Play Store, pas encore sur
l'App Store. Google accepte qu'une application Android soit le site
installable lui-même, emballé en **Trusted Web Activity** (TWA) : pas de
seconde base de code, chaque mise en ligne du site met l'application à jour, et
le hors-ligne (fiche 05) marche déjà. Coût : 25 $ une fois pour le compte
développeur.

Prérequis : fiche 40 (URL de confidentialité, exigée par Google). Fiche 38
recommandée avant (c'est l'écran que montreront les captures).

## Objectif

Tout ce qui peut être préparé dans le dépôt l'est. Il ne reste à Phil que les
gestes qui demandent son identité : créer le compte, signer, téléverser.

## Fichiers à lire

- `public/manifest.webmanifest` — nom, icônes (dont `maskable`), couleurs
- `angular.json` (`assets`), `vercel.json`, `netlify.toml` — servir
  `/.well-known/assetlinks.json`
- `tools/check-csp.mjs`, `tools/check-ngsw.mjs` — ce qui vérifie `dist/`
- `.github/workflows/ci.yml` — modèle d'un workflow
- `docs/diffusion.md` — où consigner la publication
- `e2e/` — un spec existant comme modèle pour un script de captures

## À faire

1. **Manifeste.** Compléter si besoin pour la TWA : `id`, `scope`,
   `orientation: "any"`, `categories` (`["lifestyle", "productivity"]`),
   `screenshots` (formes `narrow`, pour l'invite d'installation enrichie).
   `display: standalone` reste.

2. **Digital Asset Links.** `public/.well-known/assetlinks.json`, qui lie
   `patternreader.com` à l'application (`package_name` :
   `com.patternreader.app`), avec **les empreintes SHA-256 lues dans
   `twa/fingerprints.json`** (vide au départ : Phil y colle celle de « Play
   App Signing » après avoir créé l'application ; un fichier vide ne casse
   rien, la TWA montre alors une barre d'adresse). Vérifier que `ng build`
   copie bien un dossier commençant par un point (sinon, entrée d'asset
   explicite) et que l'hébergement le sert en `application/json`, sans
   redirection ni cache `immutable`. Un contrôle dans `tools/` fait échouer
   le build si le fichier manque de `dist/` ou n'est pas du JSON valide.

3. **Projet TWA.** `twa/twa-manifest.json` pour Bubblewrap
   (`@bubblewrap/cli`) : hôte `patternreader.com`, `startUrl` avec les paramètres UTM (voir « Mesure »),
   `packageId: "com.patternreader.app"`, nom, `launcherName`, couleurs et
   icônes tirées du manifeste, `enableNotifications: false`,
   `fallbackType: "customtabs"`, `appVersionCode` / `appVersionName`.
   Aucune clé, aucun mot de passe dans le dépôt.

4. **Construction.** Workflow `android.yml`, lancé à la main
   (`workflow_dispatch`) :
   - JDK et SDK Android (actions officielles), Bubblewrap, `bubblewrap build`
     sur `twa/` ;
   - produit l'`.aab` en artefact ;
   - la clé d'envoi vient de secrets (`ANDROID_KEYSTORE_BASE64`,
     `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
     `ANDROID_KEY_PASSWORD`). Sans eux, le job s'arrête proprement en
     écrivant dans le résumé quels secrets manquent et comment les créer.
   - Ne touche pas au pilote (`lot-suivant.yml`) ni à la CI.

5. **Fiche de la boutique**, dans `docs/play-store.md`, en anglais et en
   français, limites de Google respectées et comptées :
   - nom (30 caractères), description courte (80), description longue
     (4 000) ;
   - catégorie, classification du contenu (réponses au questionnaire : aucun
     contenu sensible), public cible (adultes) ;
   - déclaration « Sécurité des données » **cohérente avec la page de la
     fiche 40** : aucune donnée collectée ni partagée hors mesure anonyme ;
   - URL de confidentialité.

6. **Visuels**, par un script `tools/store-assets.mjs` (Playwright sur le
   build, hors CI) :
   - quatre captures téléphone 1080 × 1920 du lecteur (mode page pleine,
     répétitions, abréviation expliquée, fond sombre) avec le patron
     d'exemple — jamais un patron de tiers ;
   - l'image de présentation 1024 × 500 ;
   - l'icône 512 × 512 (celle du manifeste).
     Les fichiers produits vont dans `docs/play-store/`, pas dans `public/`.

7. **Guide pour Phil**, en tête de `docs/play-store.md`, pas à pas :
   1. Créer le compte Google Play Console (25 $, vérification d'identité).
   2. Générer la clé d'envoi (commande `keytool` donnée) et la mettre dans
      les secrets GitHub.
   3. Lancer `android.yml` et récupérer l'`.aab`.
   4. Créer l'application, activer « Play App Signing », copier l'empreinte
      SHA-256 dans `twa/fingerprints.json`, fusionner.
   5. **Test fermé** : pour un compte personnel récent, Google exige une
      douzaine de testeurs pendant 14 jours avant la production. Règle à
      revérifier dans la console au moment de publier ; lien vers la page
      d'aide de Google.
   6. Remplir la fiche de la boutique depuis `docs/play-store.md`, envoyer en
      production.
   7. Noter la publication dans `docs/diffusion.md`.

## Mesure

Les visites venant de l'application se distinguent par le `startUrl` de la
TWA : `/?utm_source=play_store&utm_medium=app`. Umami lit les paramètres UTM ;
vérifier que `tools/umami.mjs` les remonte dans le rapport quotidien, et
l'ajouter sinon (sans nouvel événement). Vérifier aussi que le lecteur ignore
ces paramètres (pas d'import de patron, pas de page 404) et que l'URL
canonique n'en contient pas.

## Tests

- Le contrôle de `tools/` : échoue si `assetlinks.json` manque ou est
  invalide, passe avec un tableau d'empreintes vide ; testé
  (`npm run test:tools`) sur les deux cas.
- Test unitaire des limites de caractères de `docs/play-store.md` (nom,
  descriptions), pour qu'une retouche ne les dépasse pas.
- e2e : `/.well-known/assetlinks.json` est servi en JSON par le serveur
  statique de test ; le manifeste contient `id`, `scope`, les icônes
  `maskable`.
- `android.yml` : lancé sur la branche sans secrets, il finit en écrivant
  dans son résumé la liste des secrets manquants (vérifié dans la PR).

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé.
- Aucun secret, mot de passe ni clé dans le dépôt.
- Le guide permet à Phil de publier sans autre aide.
- Français soigné.

## Hors périmètre

App Store et Capacitor, achats intégrés, notifications, greffons natifs,
publicités, publication automatique sur la boutique (API Play Developer).
