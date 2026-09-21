# 12 — Basculer l'anglais en langue par défaut

## Pourquoi

Le marché francophone du crochet ne contient pas assez de monde pour porter le
projet. Le marché anglophone, oui. Aujourd'hui le français est à la racine et
l'anglais sous `/en` — soit exactement l'inverse de ce qu'il faudrait pour le
référencement international.

Chantier structurant : à faire avant d'accumuler du référencement, pas après.

## Objectif

L'anglais à la racine, le français sous `/fr`, sans casser une seule URL indexée.

## Fichiers à lire

- `src/app/core/i18n/locale.ts` — `DEFAULT_LOCALE`, `LOCALES`
- `src/app/core/i18n/route-paths.json` et `route-paths.ts`
- `src/app/app.routes.ts` — voir `routesFor()` et la composition finale
- `src/app/app.routes.server.ts`
- `src/app/core/seo/seo.service.ts` — génération des `hreflang` et de `x-default`
- `tools/generate-sitemap.mjs`, `tools/check-prerender.mjs`

## À faire

1. Passer `DEFAULT_LOCALE` à `'en'`. La construction des routes dérive déjà de
   cette constante : vérifie que l'inversion suffit et ne duplique pas de logique.
2. Mettre à jour `route-paths.json` : les chemins anglais deviennent ceux de la
   racine (`/`, `/glossary`, `/format-your-pattern`), les chemins français passent
   sous `/fr` (`/fr`, `/fr/glossaire`, `/fr/bien-formater-son-patron`).
3. `x-default` doit pointer sur la version anglaise.
4. Redirections 301 des six anciennes URL vers leurs équivalents, dans
   `vercel.json` et `netlify.toml`. Sans elles, le référencement acquis est perdu.
5. Relire `src/app/core/i18n/translations.ts` en entier. Une traduction
   approximative disqualifie le site auprès d'un public anglophone. Points de
   vigilance : le vocabulaire métier ne se traduit pas mot à mot, et l'anglais
   du crochet distingue les termes US et UK — en cas de doute, prendre l'usage US
   et le signaler dans le diff.
6. Vérifier que `check-prerender.mjs` couvre bien les deux arbres après inversion.

## Critères d'acceptation

- `npm run verify` vert.
- `/` sert la version anglaise, `/fr` la version française, les deux pré-rendues.
- Chaque page porte un `canonical` correct et une paire `hreflang` complète, plus
  `x-default` vers l'anglais.
- Les six anciennes URL répondent en 301 vers leur équivalent exact.
- Le sitemap liste les six nouvelles URL et aucune ancienne.

## Hors périmètre

Ajouter une troisième langue. Détecter la langue du navigateur pour rediriger —
c'est interdit par la règle 3 : la langue vient de l'URL, jamais d'un état.
