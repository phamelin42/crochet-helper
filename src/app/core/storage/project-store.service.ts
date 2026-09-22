import { PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const DB_NAME = 'fil';
const DB_VERSION = 1;
const STORE = 'projects';

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
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE, { keyPath: 'id' });
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
   * Écrit plusieurs éléments dans **une seule** transaction : tout ou rien.
   * C'est ce qui rend l'import d'une sauvegarde atomique.
   */
  async putAll<T extends { id: string }>(items: readonly T[]): Promise<boolean> {
    const db = await this.db();
    if (!db) return false;
    return this.run(db, (store) => items.forEach((item) => store.put(item)));
  }

  async remove(id: string): Promise<boolean> {
    const db = await this.db();
    if (!db) return false;
    return this.run(db, (store) => store.delete(id));
  }

  private run(db: IDBDatabase, work: (store: IDBObjectStore) => void): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
        work(tx.objectStore(STORE));
      } catch {
        // Connexion fermée (autre onglet qui met la base à jour), ou quota
        // refusé dès l'ouverture de la transaction.
        resolve(false);
      }
    });
  }
}
