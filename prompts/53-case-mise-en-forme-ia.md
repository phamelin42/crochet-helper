# 53 — La case « Remettre en forme avec une IA »

**Étape d'entonnoir servie : activation (le premier découpage réussi fait
rester ; un PDF mal découpé fait partir).**

## Pourquoi

La fiche 52 a livré le Worker `fil-ia` (`docs/adr-003-mise-en-forme-ia.md`).
Il reste à le proposer à la lectrice : **en option**, décochée par défaut,
sans jamais perdre son patron, et en disant franchement pourquoi c'est limité.

## Décisions déjà prises

- URL du formulaire « plus d'utilisations » (Tally, « Plus de mises en forme
  par IA ? », publié par Phil le 16 octobre 2026) : `https://tally.so/r/jeDWZ4`.
- URL du Worker : **vide** (`''`) tant que Phil ne l'a pas donnée après le
  déploiement de la fiche 52. C'est un état prévu, pas un manque : la case
  n'apparaît pas, tout le reste est livré et testé. Ne pas inventer d'URL.

## Fichiers à lire

- `docs/adr-003-mise-en-forme-ia.md` ; `worker/src/index.ts` pour les statuts
- `src/app/features/reader/components/pattern-import.ts` — boutons d'import
- `grep -n "PDF_EXTRACTOR\|importPdf\|loadWithImages\|  load(" -A30 src/app/features/reader/state/reader-store.ts`
- `src/app/features/reader/data/project.model.ts`, `project-backup.ts`
- `src/app/features/reader/data/waitlist.ts` et `components/waitlist-banner.ts`
  — modèle d'une URL externe en constante, inerte si vide
- `src/app/shared/ui/checkbox/`, `shared/ui/dialog/`
- `src/app/core/analytics/analytics.service.ts`, `tools/umami.mjs`,
  `src/app/features/legal/data/privacy-events.ts`, `features/legal/pages/privacy-page.ts`
- `tools/check-csp.mjs`, `vercel.json`, `netlify.toml`
- `CLAUDE.md`, « Pièges » : entrée tierce bornée ; aucune perte ; événement
  émis depuis un `effect` ; un panneau replié cache ce qu'on y met

## Contrat

1. **Constantes**, `src/app/features/reader/data/ai-format.ts` :

   ```ts
   /** Worker de mise en forme (ADR-003). Vide = la case n'apparaît pas. */
   export const AI_FORMAT_URL = '';
   /** Formulaire « plus d'utilisations ». Vide = la dernière phrase du message disparaît. */
   export const AI_INTEREST_URL = '';
   ```

   Chacune fournie par un `InjectionToken` dont la fabrique renvoie la
   constante, pour que les tests en injectent une autre.

2. **Client**, `src/app/core/ai/format-client.ts`, chargé par `import()` derrière
   un `InjectionToken` (modèle : `PDF_EXTRACTOR`) : un `fetch` `POST` borné à
   90 s (`AbortSignal.timeout`), réponse lue en JSON et **validée** (texte de
   moins de 200 000 caractères, `restant` entier) ; toute anomalie, réseau
   compris, devient `{ ok: false, raison: 'indisponible' }`, jamais une
   exception. Ajouter `ai` à la liste de `core/` dans `CLAUDE.md`.

3. **Case**, dans le panneau d'import, au-dessus de « Charger » et « Ouvrir un
   PDF », visible sans rien déplier, **décochée à chaque ouverture** (jamais
   mémorisée) :
   - EN : « Tidy up with AI (Claude) — 3 times a day » ; aide : « The pattern
     text is sent to Anthropic to be tidied up, then split into steps here.
     Anthropic doesn't train its models on it. » + lien « Privacy »
   - FR : « Remettre en forme avec une IA (Claude) — 3 fois par jour » ; aide :
     « Le texte du patron est envoyé à Anthropic pour être remis en forme,
     puis découpé ici. Anthropic ne s'en sert pas pour entraîner ses
     modèles. » + lien « Confidentialité »

4. **Parcours**, case cochée, pour le texte collé **et** le PDF (même chemin) :
   - pendant l'appel : boutons désactivés, « Mise en forme en cours… (jusqu'à
     une minute) » / « Tidying up… (up to a minute) », annonce `aria-live` ;
   - réussite : le texte reçu suit le chemin habituel (`load` ou
     `loadWithImages`, origine `'ia'`), et le projet garde le texte d'origine
     dans un nouveau champ facultatif `Project.sourceBeforeAi` (sauvegarde
     et import de sauvegarde compris) ; ligne « Remis en forme par IA — il
     vous en reste N aujourd'hui. » avec un bouton « Revenir au texte
     d'origine » qui passe par un `Dialog` de confirmation (la progression
     repart de zéro) ;
   - refus ou échec : **le texte d'origine est chargé quand même**, par le
     parseur habituel, puis le message du point 5 s'affiche. La lectrice a
     toujours son patron.

5. **Messages**, sous les boutons d'import, jamais dans un panneau replié. Une
   première ligne selon la raison :
   - `quota-jour` — « Vous avez utilisé vos 3 mises en forme par IA
     d'aujourd'hui ; le patron est découpé par l'outil habituel. » / « You've
     used your 3 AI tidy-ups for today; the pattern is split by the usual tool. »
   - `budget-mois` — « Les mises en forme par IA de ce mois sont épuisées ; le
     patron est découpé par l'outil habituel. » / « This month's AI tidy-ups
     are used up; the pattern is split by the usual tool. »
   - `echec`, `indisponible`, `trop-long` — « La mise en forme par IA n'a pas
     abouti ; le patron est découpé par l'outil habituel. » / « The AI
     tidy-up didn't work out; the pattern is split by the usual tool. »

   Puis, **pour `quota-jour` et `budget-mois` seulement**, le message de Phil,
   exactement (espaces insécables avant `!` et dans `10 €`) :
   - FR : « Malheureusement, utiliser une IA n'est pas gratuit, et je ne
     souhaite pas dépenser plus de 10 € par mois pour ce site pour le moment.
     Désolé… Si, à l'avenir, vous voulez plus d'utilisations et seriez prête
     à en payer une partie, [faites-le-moi savoir] ! »
   - EN : « Unfortunately, using AI isn't free, and for now I don't want to
     spend more than €10 a month on this site. Sorry… If you'd like more uses
     in the future and would be willing to pay part of it, [let me know]! »

   Le texte entre crochets est le lien vers `AI_INTEREST_URL`
   (`target="_blank"`, `rel="noopener"`) ; URL vide → la phrase « Si, à
   l'avenir… » disparaît entière. Textes dans `reader-copy.ts` (le panneau
   d'import est dans le bundle initial) : les garder courts.

6. **Mesure** : `ai_format_requested` (`origine` : `saisie` | `pdf`),
   `ai_format_succeeded`, `ai_format_refused` (`raison`), jamais le texte ni
   sa longueur exacte ; émis dans le gestionnaire, pas dans un `effect`.
   Déclarés dans `AnalyticsEvent`, `EVENEMENTS` **et** `PRIVACY_EVENTS`.

7. **Confidentialité et CSP** :
   - paragraphe FR/EN dans `privacy-page.ts`, sur le modèle de celui de Tally :
     envoyé seulement case cochée, au Worker puis à Anthropic ; le Worker ne
     garde que des compteurs, dont l'empreinte change chaque jour ;
   - l'origine de `AI_FORMAT_URL`, quand elle est renseignée, entre dans
     `connect-src` de `vercel.json` **et** `netlify.toml` ;
   - `tools/check-csp.mjs` échoue si l'URL est renseignée et que son origine
     manque à l'un des deux.

## Tests

- Composant/store (Vitest, client simulé, URL injectée) : case absente quand
  l'URL est vide ; décochée par défaut et après rechargement ; cochée →
  client appelé une fois, pour le texte collé **et** pour un PDF.
- **Chaque** raison de refus (boucle sur la liste) : patron chargé par le
  parseur habituel, bonne première ligne, message de Phil pour
  `quota-jour` et `budget-mois` seulement, phrase du lien absente quand
  `AI_INTEREST_URL` est vide.
- Réussite : `sourceBeforeAi` relu par `ProjectStoreService.list()` après
  écriture (`vi.waitFor`) ; « Revenir au texte d'origine » → confirmation →
  `source` égal au texte d'origine, relu de même.
- Client : délai dépassé, JSON invalide, texte de 200 001 caractères, statut
  inconnu → `indisponible`, sans exception.
- e2e `e2e/mise-en-forme-ia.spec.ts` : si `AI_FORMAT_URL` est vide, la case est
  absente ; sinon, réponses simulées par `page.route` (réussite, `quota-jour`)
  et audit axe sur le message.

## Critères d'acceptation

- `npm run verify:ci` vert ; le client et le texte de la consigne hors du
  bundle initial ; aucune requête vers le Worker case décochée (vérifié en e2e
  par l'écoute du réseau).
- `.step-body` toujours sous 450 px à 820 × 1180 après une mise en forme.

## Hors périmètre

Le Worker (fiche 52), toute mémorisation de la case, un compteur
d'utilisations stocké dans le navigateur (le Worker fait foi), Turnstile,
paiement, la page `/format` (inchangée).
