# ADR 003 — Remettre un patron en forme avec une IA

**Statut : acceptée par Phil le 16 octobre 2026.** Deuxième écart borné à la
règle « aucun back-end », après la mesure d'audience (ADR-001).

## Problème

Le parseur déterministe (`pattern-parser.ts`) découpe bien les patrons
réguliers, moins bien les PDF mal extraits et les rédactions libres. La page
`/format` propose déjà une consigne (`format-prompt.ts`) que la lectrice copie
dans l'assistant de son choix : ça marche, mais c'est trois manipulations de
trop pour une personne de 65 ans sur tablette.

## Ce que Phil a tranché

- **Fournisseur : Anthropic (Claude).** Gemini gratuit est écarté : ses
  conditions interdisent l'offre gratuite dès qu'une application sert des
  utilisatrices de l'EEE, de Suisse ou du Royaume-Uni (`/fr` vise la France).
- **Optionnel, jamais par défaut** : une case à cocher, décochée à chaque import.
- **Budget : 10 € par mois au plus, TTC.** Le dépassement est impossible par
  construction, pas seulement surveillé (voir « Trois verrous »).
- **3 mises en forme par personne et par jour.** Au-delà, ou budget du mois
  épuisé, le patron est découpé par l'outil habituel et un message de Phil
  explique pourquoi, avec un lien pour dire qu'on paierait une partie.

## Ni entraînement ni « skill »

Inutile d'entraîner un modèle : la tâche est une remise en forme, et la
consigne existe déjà (`FORMAT_PROMPT`). Elle devient la consigne système de
l'appel. Une seule source : améliorer la consigne améliore aussi la page
`/format`. Une _skill_ Claude sert aux agents qui exécutent du code ; ici, un
seul appel suffit. La qualité se règle en mesurant sur les fixtures du dépôt
(`src/app/features/reader/data/fixtures/`), pas en devinant.

## Architecture

```
navigateur ── POST texte ──▶ Worker Cloudflare (fil-ia) ──▶ API Claude
           ◀── texte remis en forme ou refus motivé ──┘
                                │
                     KV : compteurs du jour et du mois
```

- Le **Worker** (`worker/`, fiche 52) garde la clé, applique le quota et le
  budget, appelle `claude-sonnet-5-5` et vérifie la fidélité de la réponse.
- L'**app** (fiche 53) envoie le texte seulement si la case est cochée, puis
  passe la réponse au parseur habituel : `parsePattern` reste l'unique
  découpeur, le format des projets ne change pas.
- Le Worker ne stocke **aucun texte** : seulement des compteurs, dont la clé
  est une empreinte de l'IP salée **par jour** (aucun identifiant durable).

## Modèle et coût

`claude-sonnet-5-5`, effort `low`, à 2 $ en entrée et 10 $ en sortie par
million de tokens. Choix du 16 octobre 2026, après `worker/eval/evaluer.mjs` :
Haiku 5.5 n'était pas fidèle sur 1 patron sur 5 (celui que l'outil habituel ne
découpe pas), Sonnet l'était sur les 5. Une mise en forme coûte environ 1
centime (0,5 à 2 centimes mesurés) : 7 $ paient environ 600 mises en forme par
mois, et le plafond du jour (0,70 $) environ 60. Le modèle et ses prix sont des
variables du Worker (`wrangler.toml`) : en changer ne demande aucun code, mais
les prix doivent suivre le modèle, car ils servent au calcul de la dépense.

## Trois verrous de dépense

1. **Crédits prépayés, rechargement automatique coupé** (console Anthropic) :
   on ne peut pas dépenser plus que ce qui a été chargé. 8 $ HT restent sous
   10 € TTC, TVA comprise.
2. **Plafond mensuel dans le Worker** (`BUDGET_MOIS_USD`, 7 $) calculé sur
   l'`usage` réel de chaque réponse, et plafond du jour à un dixième : une
   rafale ne vide pas le mois en un après-midi.
3. **3 par personne et par jour**, comptées seulement quand la mise en forme
   réussit.

Les compteurs KV sont à cohérence différée : un dépassement de quelques
centimes est possible au plafond du Worker, jamais au-delà des crédits.

## Fidélité : sauter un rang ruine un ouvrage

Le Worker refuse une réponse (et la lectrice obtient le découpage habituel) si :
la génération ne s'est pas terminée normalement (`stop_reason` autre que
`end_turn`) ; la réponse contient un nombre absent du texte d'origine (maille
ou rang inventé) ; elle fait moins de 40 % de la longueur d'origine (résumé ou
coupure). L'app garde le texte d'origine avec le projet et permet d'y revenir.

## Confidentialité

C'est la première fois que le texte d'un patron quitte l'appareil : seulement
case cochée, vers le Worker puis Anthropic, qui n'entraîne pas ses modèles sur
les données de l'API. La page de confidentialité, la déclaration « Sécurité
des données » du Play Store et la CSP (`connect-src`) le disent.

## Ce qui reste à faire hors du code

Comptes, crédits, Worker, formulaire Tally : Phil, avec le prompt de
navigateur donné le 16 octobre 2026.

- **Fait le 16 octobre** (partie A) : espace « fil-ia » dans la console
  Anthropic, limite de dépense mensuelle de 8 $ sur cet espace (remise à zéro
  le 1er du mois), rechargement automatique coupé, clé « fil-ia-worker »
  limitée à cet espace ; namespace KV `fil-ia-quotas` ; formulaire Tally
  `https://tally.so/r/jeDWZ4`.
- **Fait le 16 octobre** (partie B) : Worker déployé, secrets posés. Son
  adresse, `https://fil-ia.hamelinphilippe1.workers.dev/mise-en-forme`, est
  `AI_FORMAT_URL` ; son origine est dans `connect-src` (`vercel.json` et
  `netlify.toml`). Le Worker n'accepte que `https://patternreader.com` : la
  case ne marche ni en local ni sur une prévisualisation.
- **Après la fiche 53** (partie C) : déclaration « Sécurité des données » du
  Play Store.

## Ce qui n'est pas décidé

Turnstile (anti-robots) : ajouté seulement si un abus est constaté, le budget
borne déjà la perte. Une offre payante d'utilisations en plus : on attend les
réponses au formulaire.
