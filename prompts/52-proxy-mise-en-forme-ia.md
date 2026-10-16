# 52 — Le proxy de mise en forme par IA (Worker Cloudflare)

**Étape d'entonnoir servie : activation (un PDF mal extrait devient un patron
suivable du premier coup).**

## Pourquoi

Phil, le 16 octobre : « que les utilisateurs puissent coller leur patron et
leur PDF et que la transformation se fasse mieux », en option, 3 fois par jour,
**jamais plus de 10 € par mois**. La clé d'API et le quota ne peuvent vivre
que hors du navigateur : c'est le seul serveur du projet, borné par
`docs/adr-003-mise-en-forme-ia.md`. Lis l'ADR en entier avant de commencer.

## Décision manquante

`wrangler.toml` a besoin de l'identifiant du namespace KV créé par Phil. Si la
ligne ci-dessous dit encore `A_RENSEIGNER`, **s'arrêter et le demander**.

- Identifiant KV `fil-ia-quotas` : `A_RENSEIGNER`

## Objectif

Un Worker `fil-ia` dans `worker/`, déployé par Cloudflare depuis `main`, qui
reçoit un texte, vérifie quota et budget, demande à Claude de le remettre en
forme avec la consigne de `/format`, vérifie la fidélité de la réponse et la
renvoie. Aucun texte n'est stocké ni journalisé.

## Fichiers à lire

- `docs/adr-003-mise-en-forme-ia.md`
- `src/app/features/format/format-prompt.ts` — la consigne, réutilisée telle quelle
- `package.json` (scripts `verify`, `test:tools`), `eslint.config.*`, `.prettierignore`
- `.github/workflows/ci.yml` — vérifier que rien n'y est à ajouter
- Pour l'API Claude : la skill `claude-api` si elle est disponible, sinon
  la documentation du SDK `@anthropic-ai/sdk`. Ne pas écrire un appel de mémoire.

## Contrat

### Arborescence

```
worker/
  wrangler.toml        name = "fil-ia", main = "src/index.ts", KV QUOTAS, [vars]
  tsconfig.json        types Workers, strict
  src/index.ts         routage, CORS, enchaînement ; aucune logique pure ici
  src/quota.ts         empreinte, clés, plafonds — fonctions pures
  src/fidelite.ts      garde de fidélité — fonction pure
  src/consigne.ts      FORMAT_PROMPT[langue] + complément ci-dessous
  src/*.spec.ts        tests Vitest
  eval/evaluer.mjs     mesure manuelle sur les fixtures (hors CI, coûte)
```

Dépendances ajoutées **au `package.json` racine** en `devDependencies` :
`@anthropic-ai/sdk`, `wrangler`, `@cloudflare/workers-types`. Aucune n'entre
dans le bundle Angular (vérifier par `ng build --stats-json`). Script
`"test:worker": "vitest run --root worker"`, ajouté à `verify` après
`test:tools`.

### Variables (`[vars]`, modifiables sans code)

| Nom                    | Valeur                      |
| ---------------------- | --------------------------- |
| `MODELE`               | `claude-haiku-5-5`          |
| `EFFORT`               | `low`                       |
| `PRIX_ENTREE_MTOK_USD` | `0.10`                      |
| `PRIX_SORTIE_MTOK_USD` | `0.50`                      |
| `BUDGET_MOIS_USD`      | `7`                         |
| `QUOTA_JOUR`           | `3`                         |
| `ORIGINES`             | `https://patternreader.com` |
| `MAX_CARACTERES`       | `60000`                     |

Secrets (posés par Phil dans le tableau de bord, **jamais dans le dépôt**) :
`ANTHROPIC_API_KEY`, `SEL_QUOTA`.

### Route unique

`POST /mise-en-forme`, corps JSON `{ "texte": string, "langue": "fr" | "en" }`.

| Statut | Corps                                    | Quand                                                     |
| ------ | ---------------------------------------- | --------------------------------------------------------- |
| 200    | `{ "texte": string, "restant": number }` | réussite ; `restant` = mises en forme restantes du jour   |
| 400    | `{ "raison": "requete" }`                | JSON invalide, langue inconnue, texte vide                |
| 413    | `{ "raison": "trop-long" }`              | texte au-delà de `MAX_CARACTERES`, **vérifié avant tout** |
| 429    | `{ "raison": "quota-jour" }`             | `QUOTA_JOUR` réussites déjà comptées aujourd'hui          |
| 429    | `{ "raison": "budget-mois" }`            | plafond du mois ou du jour atteint                        |
| 422    | `{ "raison": "echec" }`                  | garde de fidélité, `refusal`, `max_tokens`                |
| 503    | `{ "raison": "indisponible" }`           | toute erreur de l'API Claude (crédits épuisés compris)    |

`OPTIONS` répond au pré-vol CORS. `Access-Control-Allow-Origin` ne renvoie que
l'origine reçue si elle figure dans `ORIGINES` ; sinon 403 sans appel à Claude.
Toute autre méthode ou route : 404. Le Worker ne lève jamais d'exception vers
l'extérieur : toute erreur imprévue devient 503.

### Quota et budget (`quota.ts`)

- Empreinte : SHA-256 de `SEL_QUOTA + date UTC (AAAA-MM-JJ) + CF-Connecting-IP`,
  en hexadécimal. Le sel du jour rend l'empreinte inutilisable le lendemain.
- Clés KV : `jour:<date>:<empreinte>` (réussites, TTL 2 jours) ;
  `mois:<AAAA-MM>` et `depense:<date>` (dépense en micro-dollars, entiers,
  TTL 40 jours et 2 jours).
- Refus `budget-mois` si `mois` ≥ `BUDGET_MOIS_USD`, ou `depense` du jour
  ≥ `BUDGET_MOIS_USD / 10`. Contrôle **avant** l'appel.
- Après l'appel, réussi ou non : ajouter le coût calculé sur `usage`
  (`input_tokens` × prix d'entrée + `output_tokens` × prix de sortie ; la
  réflexion est comptée dans `output_tokens`). Après une réussite seulement :
  +1 sur le compteur `jour` de la personne.

### Appel à Claude

- SDK `@anthropic-ai/sdk`, `messages.stream(...)` puis `finalMessage()` (une
  réponse longue dépasserait un appel non diffusé), `max_tokens: 32000`,
  `output_config: { effort: EFFORT }`, aucun paramètre `thinking`.
- Consigne système = `FORMAT_PROMPT[langue]` (importé depuis
  `src/app/features/format/format-prompt.ts`, pas recopié), suivie de :
  « Conserve tels quels, à leur place, les marqueurs [image N]. » (en anglais
  pour `en`). Message utilisateur = le texte seul.
- Lire `stop_reason` **avant** le contenu ; concaténer les blocs `text`.

### Fidélité (`fidelite.ts`)

```ts
export function fidele(entree: string, sortie: string): boolean;
```

Faux si : sortie vide ; un nombre (suite de chiffres) de la sortie n'apparaît
nulle part dans l'entrée ; longueur de la sortie < 40 % de celle de l'entrée.

## Tests (`worker/src/*.spec.ts`, client Claude et KV simulés)

- `fidele` : texte identique → vrai ; « 6 ms » devenu « 7 ms » → faux ; rang
  ajouté avec un nouveau numéro → faux ; « 1. » devenu « Rang 1 : » → vrai ;
  sortie à 39 % puis à 41 % de la longueur ; sortie vide.
- Route : **chaque** ligne du tableau des statuts obtenue au moins une fois
  (boucle sur une table de cas) ; le texte trop long est refusé **sans**
  appel à Claude ni écriture KV ; origine absente d'`ORIGINES` → 403 sans
  appel.
- Quota : 3 réussites → la 4ᵉ est refusée ; un échec (422) ne consomme pas le
  quota de la personne mais compte dans la dépense ; empreintes différentes
  pour deux dates.
- Budget : `mois` à 6,999 $ → appel ; à 7 $ → refus sans appel ; plafond du
  jour à un dixième.
- Aucun appel ne journalise le texte : espionner `console.*` et vérifier
  qu'aucun argument ne contient le texte envoyé.

## Mesure de la qualité (manuelle, avant d'activer la case)

`node worker/eval/evaluer.mjs` (lit `ANTHROPIC_API_KEY` de l'environnement,
refuse de tourner sans) : pour chaque fixture de
`src/app/features/reader/data/fixtures/`, et pour `claude-haiku-5-5` en effort
`low` puis `medium`, et `claude-sonnet-5-5` en `low` : garde de fidélité, nombre
d'étapes trouvées par `parsePattern` avant et après, coût réel. Tableau imprimé
en Markdown. Coût total attendu : quelques centimes. Le script n'est **pas**
dans la CI ; la PR dit qu'il n'a pas été lancé si la clé manquait.

## Critères d'acceptation

- `npm run verify:ci` vert, `test:worker` compris.
- `npx wrangler deploy --dry-run --config worker/wrangler.toml` réussit.
- `ng build --stats-json` : ni le SDK ni le code du Worker dans le bundle Angular.
- `CLAUDE.md` (architecture) mentionne `worker/` en une ligne.

## Hors périmètre

Tout changement de l'app Angular (fiche 53), Turnstile, comptes, paiement,
diffusion de la réponse vers le navigateur, mise en cache de la consigne (trop
courte pour être mise en cache), tout stockage du texte.
