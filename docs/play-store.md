# Play Store — publier l'application Android

Fiche 41. L'application est le site lui-même, emballé en **Trusted Web Activity**
(TWA) : pas de seconde base de code, chaque mise en ligne du site met
l'application à jour, et le hors-ligne marche déjà. Tout ce qui se prépare dans
le dépôt l'est ; ce guide ne garde que les gestes qui demandent ton identité.

## Guide pas à pas (Phil)

### 1. Créer le compte Google Play Console

[play.google.com/console/signup](https://play.google.com/console/signup). 25 $
une fois, vérification d'identité (pièce d'identité, parfois quelques jours).
Choisir un compte **personnel** ou **organisation** : les règles de test de
l'étape 5 en dépendent.

### 2. Générer la clé d'envoi et la mettre dans les secrets GitHub

Sur ton poste, avec un JDK installé :

```bash
keytool -genkeypair -v -keystore android.keystore -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Garde `android.keystore` **hors du dépôt** (`.gitignore` l'ignore) et sauvegarde-le
avec son mot de passe : c'est la clé d'envoi, Google garde la clé de signature.
Puis, dans GitHub → Settings → Secrets and variables → Actions, crée quatre
secrets :

| Secret                      | Valeur                                          |
| --------------------------- | ----------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | `base64 -w0 android.keystore` (une seule ligne) |
| `ANDROID_KEYSTORE_PASSWORD` | le mot de passe du fichier de clés              |
| `ANDROID_KEY_ALIAS`         | `upload`                                        |
| `ANDROID_KEY_PASSWORD`      | le mot de passe de la clé                       |

### 3. Lancer la construction et récupérer l'`.aab`

Actions → **Android** → Run workflow (le workflow est
`.github/workflows/android.yml`). Sans les secrets, il
s'arrête en listant ceux qui manquent. Sinon, l'artefact `application-android`
contient `app-release-bundle.aab`.

### 4. Créer l'application et relever l'empreinte

1. Console Play → Créer une application : nom, langue par défaut (anglais),
   application, gratuite.
2. Production ou Test → Créer une version → envoyer l'`.aab`. **Activer « Play App
   Signing »** quand la console le propose.
3. Configuration → Intégrité de l'application → Signature : copier l'empreinte
   **SHA-256 du certificat de signature de l'application** (format
   `AA:BB:…`, 32 octets).
4. La coller dans `twa/fingerprints.json` :

   ```json
   ["AA:BB:CC:…"]
   ```

   Ajouter aussi l'empreinte de la clé d'envoi (`keytool -list -v -keystore android.keystore`)
   si tu installes l'`.apk` hors boutique. Le build refuse une empreinte mal formée.

5. Fusionner : le prochain déploiement publie `/.well-known/assetlinks.json`.
   Vérifier : `https://patternreader.com/.well-known/assetlinks.json` répond en JSON,
   sans redirection. Tant que l'empreinte manque, l'application marche mais
   montre une barre d'adresse.

### 5. Test fermé

Pour un compte personnel créé récemment, Google exige **une douzaine de testeurs
pendant 14 jours** avant d'autoriser la production. Règle à revérifier dans la
console au moment de publier :
[support.google.com/googleplay/android-developer/answer/14151465](https://support.google.com/googleplay/android-developer/answer/14151465).
Piste « Test fermé » → liste de testeurs (adresses Gmail) → envoyer la version.

### 6. Remplir la fiche et envoyer en production

Copier les textes de la section suivante (anglais par défaut, français en
traduction), les visuels de `docs/play-store/`, l'URL de confidentialité, le
questionnaire de classification et la déclaration de sécurité des données. Puis
Production → Créer une version → Envoyer pour examen.

### 7. Noter la publication

Une ligne dans le journal de `docs/diffusion.md` (date, « Play Store », lien de
la fiche). Les visites venant de l'application arrivent avec
`utm_source=play_store&utm_medium=app` : le rapport quotidien les sépare.

## Fiche de la boutique

Limites de Google : nom 30 caractères, description courte 80, description
longue 4 000. `tools/play-store.test.mjs` compte chaque bloc ci-dessous.

### Anglais

#### Name (en)

```text
Pattern Reader: Crochet & Knit
```

#### Short description (en)

```text
Read crochet and knitting patterns one step at a time, in large print.
```

#### Full description (en)

```text
Follow any crochet or knitting pattern one instruction at a time, in very large print, with your hook or needles in hand.

Paste the text of a pattern, or open a PDF, and Pattern Reader splits it into steps. You see a single instruction, big enough to read from an arm's length away, on a phone or a tablet.

WHAT IT DOES
• One step at a time, in large print: no more losing your place in a long pattern.
• Repeat counter: count the stitches of a repeat, the rows of a section, with big buttons.
• Abbreviations explained: touch "sc", "dc" or "k2tog" and get its meaning.
• A timer for your session, so you know how long a piece takes.
• Your projects are kept on your device: come back tomorrow and pick up at the same row.
• A dark background for evening crochet.
• Works offline, once opened: nothing to download while you work.

MADE FOR PEOPLE WHO CROCHET AND KNIT
Large text, strong contrast and big touch targets, because a pattern is read from a distance with busy hands. Available in English and French.

PRIVATE BY DESIGN
No account, no sign-up. Your patterns never leave your device. The only thing measured is anonymous usage (which pages are visited), with no cookie and no identifier.

Free. Works with any pattern you have the right to use.
```

### Français

#### Name (fr)

```text
Pattern Reader crochet/tricot
```

#### Short description (fr)

```text
Lisez vos patrons de crochet et de tricot une étape à la fois, en grand.
```

#### Full description (fr)

```text
Suivez n'importe quel patron de crochet ou de tricot une instruction à la fois, en très grand, le crochet ou les aiguilles en main.

Collez le texte d'un patron, ou ouvrez un PDF : Pattern Reader le découpe en étapes. Vous ne voyez qu'une seule instruction, assez grande pour être lue à bout de bras, sur téléphone comme sur tablette.

CE QUE FAIT L'APPLICATION
• Une étape à la fois, écrite en grand : plus besoin de chercher sa ligne dans un long patron.
• Compteur de répétitions : comptez les mailles d'une répétition, les rangs d'une section, avec de gros boutons.
• Abréviations expliquées : touchez « sc », « dc » ou « k2tog » et obtenez leur sens.
• Un chronomètre pour votre séance, afin de savoir combien de temps prend un ouvrage.
• Vos projets restent sur votre appareil : revenez demain et reprenez au même rang.
• Un fond sombre pour le crochet du soir.
• Fonctionne hors ligne une fois ouverte : rien à télécharger pendant que vous travaillez.

CONÇUE POUR CELLES ET CEUX QUI FONT DU CROCHET ET DU TRICOT
Texte large, fort contraste et grandes zones à toucher, parce qu'on lit un patron à distance, les mains occupées. Disponible en français et en anglais.

RESPECTUEUSE DE VOTRE VIE PRIVÉE
Pas de compte, pas d'inscription. Vos patrons ne quittent jamais votre appareil. La seule chose mesurée est l'usage anonyme (quelles pages sont consultées), sans cookie ni identifiant.

Gratuite. Fonctionne avec tout patron que vous avez le droit d'utiliser.
```

### Catégorie, classification, public

- **Type** : application, gratuite. **Catégorie** : Style de vie (`Lifestyle`). Le
  manifeste annonce aussi `productivity`, mais la boutique n'en accepte qu'une.
- **Classification du contenu** (questionnaire IARC) : catégorie « Utilitaire,
  productivité, communication ou autre ». Toutes les réponses sont **non** :
  violence, sexualité, langage grossier, substances, jeux d'argent, contenu
  généré par les utilisateurs partagé avec d'autres, partage de localisation,
  achats numériques. Résultat attendu : tout public.
- **Public cible** : adultes (18 ans et plus). Pas d'application destinée aux
  enfants.
- **Annonces** : l'application n'en contient pas. **Achats intégrés** : aucun.

### Déclaration « Sécurité des données »

Cohérente avec la page de confidentialité (`/privacy`, `/fr/confidentialite`,
fiche 40) : les patrons, la progression et les préférences restent dans le
navigateur de l'appareil ; seule la mesure d'audience Umami, anonyme, sans
cookie ni identifiant, part vers notre serveur.

| Question de la console                          | Réponse                                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L'application collecte-t-elle des données ?     | **Oui**, uniquement la mesure anonyme ci-dessous (à revérifier dans la console : le formulaire change).                                                                               |
| Données partagées avec des tiers ?              | **Non.** Umami est installé sur notre propre serveur (OVH), rien n'est vendu ni transmis.                                                                                             |
| Localisation approximative                      | Collectée (le pays, déduit de la requête), non partagée, non facultative, finalité « Analyses ».                                                                                      |
| Activité dans l'application                     | Collectée (pages vues et gestes listés dans la page de confidentialité, sans le contenu saisi), non partagée, finalité « Analyses ».                                                  |
| Infos sur l'appareil                            | Collectées (type d'appareil et de navigateur, langue), non partagées, finalité « Analyses ». Aucun identifiant d'appareil ou de publicité.                                            |
| Contenu de l'utilisateur (patrons, photos, PDF) | **Non collecté** : reste dans le navigateur de l'appareil.                                                                                                                            |
| Données chiffrées en transit ?                  | **Oui** (HTTPS).                                                                                                                                                                      |
| Demande de suppression ?                        | Aucune donnée personnelle n'est conservée côté serveur. Effacer les données du site dans les réglages de l'appareil supprime tout ce qui est local (voir la page de confidentialité). |
| Compte                                          | Aucun.                                                                                                                                                                                |

### URL de confidentialité

```text
https://patternreader.com/privacy
```

Version française, si la console propose une langue : `https://patternreader.com/fr/confidentialite`.

### Visuels

Produits par `node tools/store-assets.mjs` (à relancer après un changement du
lecteur, voir l'en-tête du script). Jamais un patron de tiers : le patron
d'exemple du site.

| Fichier                              | Usage                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `docs/play-store/icone-512.png`      | icône de l'application (512 × 512)                                     |
| `docs/play-store/presentation-*.png` | image de présentation (1024 × 500), `en` et `fr`                       |
| `docs/play-store/capture-1…3-*.png`  | captures téléphone 1080 × 2160 : page pleine, page complète, glossaire |

Les captures montrent, dans l'ordre : la page pleine (une étape en cours, deux
répétitions comptées, une séance de 12 min 34), la page complète du lecteur et le
glossaire.
