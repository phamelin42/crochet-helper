/**
 * Lecture et écriture du magasin `favorites` (fiche 61). Fonctions à part,
 * chargées par `import()` quand on touche aux favoris (pages Ravelry, sauvegarde) :
 * le lecteur, seul au premier affichage, n'en paie rien. La base vient de
 * `ProjectStoreService.db()`, qui crée le magasin à la migration v2 → v3.
 */
const STORE = 'favorites';

/** Favoris enregistrés ; `[]` si le stockage est indisponible. */
export function readFavorites<T>(db: IDBDatabase | null): Promise<T[]> {
  if (!db) return Promise.resolve([]);
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as T[]) ?? []);
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/** Une seule transaction ; `true` seulement une fois validée (un quota dépassé est un `abort`). */
function write(
  db: IDBDatabase | null,
  work: (favorites: IDBObjectStore) => void,
): Promise<boolean> {
  if (!db) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
      work(tx.objectStore(STORE));
    } catch {
      resolve(false);
    }
  });
}

export const writeFavorites = <T extends { id: string }>(
  db: IDBDatabase | null,
  items: readonly T[],
) => write(db, (store) => items.forEach((item) => store.put(item)));

export const deleteFavorites = (db: IDBDatabase | null, ids: readonly string[]) =>
  write(db, (store) => ids.forEach((id) => store.delete(id)));

export const clearFavorites = (db: IDBDatabase | null) => write(db, (store) => store.clear());
