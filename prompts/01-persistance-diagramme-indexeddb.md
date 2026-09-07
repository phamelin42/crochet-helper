# 01 — Persister le diagramme importé dans IndexedDB

## Problème

Le diagramme importé est converti en `data:` URL et rangé dans `localStorage`
avec le reste de l'état. Une photo dépasse vite le quota (~5 Mo) : le magasin
refuse alors d'écrire, et **c'est toute la sauvegarde qui est perdue**, patron et
progression compris. Le garde-fou actuel — ne pas persister au-delà de 1,5 Mo
(`MAX_PERSISTED_IMAGE` dans `reader-store.ts`) — protège les données mais fait
disparaître le diagramme au rechargement.

## Objectif

Sortir l'image de `localStorage` et la ranger dans IndexedDB, sans quota
pratique. Au rechargement, le diagramme doit réapparaître.

## Fichiers à lire

- `src/app/features/reader/state/reader-store.ts`
- `src/app/core/storage/local-storage.service.ts`
- `src/app/features/reader/components/pattern-import.ts`
- `src/app/features/reader/components/diagram-panel.ts`

## À faire

1. Créer `src/app/core/storage/image-store.service.ts`, service `@Service()` :

   ```ts
   save(id: string, blob: Blob): Promise<void>;
   load(id: string): Promise<Blob | null>;
   remove(id: string): Promise<void>;
   ```

   Base `fil`, magasin d'objets `diagrams`. Écrire l'API IndexedDB à la main
   (pas de dépendance nouvelle) ; en cas d'indisponibilité — rendu serveur,
   navigation privée, quota — les méthodes se résolvent sans lever, et `load`
   renvoie `null`.

2. Stocker un **`Blob`**, pas une chaîne base64 : `FileReader` n'est plus
   nécessaire à l'import, `URL.createObjectURL` suffit à l'affichage.

3. Dans `ReaderStore` : remplacer le champ `image` (data URL) par un identifiant
   d'image persisté dans `localStorage`, plus un signal d'URL d'objet pour
   l'affichage. Révoquer l'URL précédente (`URL.revokeObjectURL`) à chaque
   remplacement et à la destruction — sinon la mémoire fuit à chaque import.
   Retirer `MAX_PERSISTED_IMAGE`.

4. Restaurer l'image dans le `afterNextRender` existant, jamais côté serveur.

5. `clear()` et le bouton « Retirer » suppriment aussi l'entrée IndexedDB.

## Critères d'acceptation

- Importer un diagramme, recharger la page : le diagramme est toujours là.
- Importer une photo de 4 Mo : elle s'affiche, elle survit au rechargement, et le
  patron et la progression restent sauvegardés.
- Retirer le diagramme puis recharger : rien ne revient, et la base ne contient
  plus l'entrée.
- Aucune `data:` URL d'image dans `localStorage` (vérifiable dans l'inspecteur).
- Tests : `image-store.service.spec.ts` couvre l'absence d'IndexedDB (le service
  dégrade sans lever) et le cycle sauvegarde → lecture → suppression avec un
  faux minimal.
- `npm run verify` vert.

## Hors périmètre

Le zoom, la reconnaissance de symboles, la compression d'image, le stockage de
plusieurs diagrammes par patron. Ne touche pas au parseur ni au SEO.
