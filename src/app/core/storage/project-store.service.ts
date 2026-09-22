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
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }

  async list<T>(): Promise<T[]> {
    const db = await this.db();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as T[]) ?? []);
      request.onerror = () => resolve([]);
    });
  }

  /** Renvoie `false` sans lever si IndexedDB est indisponible : l'appelant
   *  décide alors s'il doit conserver un repli (ex. ne pas effacer l'ancien
   *  stockage tant que la migration n'a pas vraiment réussi). */
  async put<T extends { id: string }>(item: T): Promise<boolean> {
    const db = await this.db();
    if (!db) return false;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    return true;
  }

  async remove(id: string): Promise<void> {
    const db = await this.db();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}
