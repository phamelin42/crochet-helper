import { PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const DB_NAME = 'fil';
/** Version 2 : ajout du magasin `images` (fiche 34). */
const DB_VERSION = 2;
const STORE = 'projects';
/** Fichiers rattachés aux projets (photos d'un PDF), clé `${projectId}:${n}`. */
const IMAGES = 'images';

/**
 * Accès à IndexedDB pour les projets, sans quota pratique — contrairement à
 * `localStorage`, plafonné vers 5 Mo et intenable dès qu'on garde plusieurs
 * patrons. Générique sur le type stocké pour rester dans `core/` : le modèle
 * `Project` appartient au domaine de `features/reader`, que `core` ne peut pas
 * importer.
 *
 * Toute indisponibilité — rendu serveur, navigation privée, quota, très vieux
 * navigateur — dégrade silencieusement : `list` renvoie `[]`, `put` renvoie
 * `false`, jamais d'exception. Le reste de l'application reste utilisable,
 * simplement sans sauvegarde.
 */
@Service()
export class ProjectStoreService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private db(): Promise<IDBDatabase | null> {
    if (!this.isBrowser) return Promise.resolve(null);
    return (this.dbPromise ??= this.open());
  }

  private open(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch {
        resolve(null);
        return;
      }
      // Chaque magasin est créé s'il manque : une base en version 1 reçoit
      // `images` sans que ses projets soient touchés.
      request.onupgradeneeded = () => {
        for (const name of [STORE, IMAGES]) {
          if (!request.result.objectStoreNames.contains(name)) {
            request.result.createObjectStore(name, { keyPath: 'id' });
          }
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // Un autre onglet ouvre une version plus récente : on libère la base,
        // et la prochaine opération rouvrira une connexion.
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }

  async list<T>(): Promise<T[]> {
    const db = await this.db();
    if (!db) return [];
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

  /**
   * Écrit un élément. Renvoie `true` seulement quand la transaction est
   * **validée** : un quota dépassé se manifeste par un `abort`, pas par un
   * `error`, et ne doit jamais passer pour un succès — la migration efface
   * l'ancien stockage sur la foi de ce booléen.
   */
  put<T extends { id: string }>(item: T): Promise<boolean> {
    return this.putAll([item]);
  }

  /**
   * Écrit plusieurs éléments, et leurs fichiers rattachés, dans **une seule**
   * transaction : tout ou rien. C'est ce qui rend atomiques l'import d'une
   * sauvegarde et l'enregistrement d'un PDF avec ses photos.
   */
  async putAll<T extends { id: string }, F extends { id: string } = { id: string }>(
    items: readonly T[],
    files: readonly F[] = [],
  ): Promise<boolean> {
    const db = await this.db();
    if (!db) return false;
    return this.run(db, (projects, images) => {
      items.forEach((item) => projects.put(item));
      files.forEach((file) => images.put(file));
    });
  }

  /** Supprime un élément et ses fichiers rattachés, dans la même transaction. */
  async remove(id: string, fileIds: readonly string[] = []): Promise<boolean> {
    const db = await this.db();
    if (!db) return false;
    return this.run(db, (projects, images) => {
      projects.delete(id);
      fileIds.forEach((fileId) => images.delete(fileId));
    });
  }

  /** Lit des fichiers rattachés par leur clé ; `undefined` pour une clé absente. */
  async getFiles<F>(ids: readonly string[]): Promise<(F | undefined)[]> {
    const db = await this.db();
    if (!db || !ids.length) return ids.map(() => undefined);
    return new Promise((resolve) => {
      try {
        const store = db.transaction(IMAGES, 'readonly').objectStore(IMAGES);
        const found: (F | undefined)[] = ids.map(() => undefined);
        let pending = ids.length;
        ids.forEach((id, index) => {
          const request = store.get(id);
          const settle = (): void => {
            if (--pending === 0) resolve(found);
          };
          request.onsuccess = () => {
            found[index] = request.result as F | undefined;
            settle();
          };
          request.onerror = settle;
        });
      } catch {
        resolve(ids.map(() => undefined));
      }
    });
  }

  private run(
    db: IDBDatabase,
    work: (projects: IDBObjectStore, images: IDBObjectStore) => void,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([STORE, IMAGES], 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
        work(tx.objectStore(STORE), tx.objectStore(IMAGES));
      } catch {
        // Connexion fermée (autre onglet qui met la base à jour), ou quota
        // refusé dès l'ouverture de la transaction.
        resolve(false);
      }
    });
  }
}
