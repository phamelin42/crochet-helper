import { PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const BASE = 'app';
const MAGASIN = 'donnees';

/**
 * Stockage durable des données de la personne (IndexedDB), clé → valeur.
 *
 * Une écriture n'est réussie qu'au `complete` de la transaction : un quota
 * dépassé déclenche `abort`, et la promesse est alors rejetée. On n'efface
 * jamais une ancienne copie sur la foi d'une écriture non confirmée ;
 * plusieurs écritures liées passent par `writeMany` (une seule transaction).
 * Côté serveur (pré-rendu), tout renvoie `null` sans erreur.
 */
@Service()
export class KvStoreService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private db: Promise<IDBDatabase> | null = null;

  async read<T>(key: string): Promise<T | null> {
    const db = await this.open();
    if (!db) return null;
    return new Promise((resolve) => {
      const req = db.transaction(MAGASIN).objectStore(MAGASIN).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  }

  write(key: string, value: unknown): Promise<void> {
    return this.writeMany({ [key]: value });
  }

  async writeMany(entries: Record<string, unknown>): Promise<void> {
    const db = await this.open();
    if (!db) throw new Error('Stockage indisponible');
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MAGASIN, 'readwrite');
      const store = tx.objectStore(MAGASIN);
      for (const [key, value] of Object.entries(entries)) store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error('Écriture annulée'));
      tx.onerror = () => reject(tx.error ?? new Error('Écriture refusée'));
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.open();
    if (!db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MAGASIN, 'readwrite');
      tx.objectStore(MAGASIN).delete(key);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Suppression refusée'));
    });
  }

  private open(): Promise<IDBDatabase | null> {
    if (!this.isBrowser || typeof indexedDB === 'undefined') return Promise.resolve(null);
    this.db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(BASE, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(MAGASIN);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.db.catch(() => null);
  }
}
