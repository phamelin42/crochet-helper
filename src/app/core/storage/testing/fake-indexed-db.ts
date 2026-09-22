/**
 * Fausse IndexedDB minimale pour les tests : jsdom n'implémente pas l'API, et
 * la fiche interdit toute dépendance nouvelle. Couvre uniquement ce dont
 * `ProjectStoreService` se sert — `put`, `getAll`, `delete` — avec des
 * callbacks asynchrones (microtâches), comme le ferait un vrai navigateur.
 */

type Listener = ((event: Event) => void) | null;

interface StoreEntry {
  readonly keyPath?: string;
  readonly data: Map<unknown, unknown>;
}

class FakeRequest {
  result: unknown;
  onsuccess: Listener = null;
  onerror: Listener = null;
}

class FakeOpenRequest extends FakeRequest {
  onupgradeneeded: Listener = null;
  onblocked: Listener = null;
}

class FakeObjectStore {
  constructor(private readonly entry: StoreEntry) {}

  put(value: unknown): FakeRequest {
    const request = new FakeRequest();
    const key = this.entry.keyPath
      ? (value as Record<string, unknown>)[this.entry.keyPath]
      : undefined;
    queueMicrotask(() => {
      this.entry.data.set(key, value);
      request.result = key;
      request.onsuccess?.(new Event('success'));
    });
    return request;
  }

  getAll(): FakeRequest {
    const request = new FakeRequest();
    queueMicrotask(() => {
      request.result = [...this.entry.data.values()];
      request.onsuccess?.(new Event('success'));
    });
    return request;
  }

  delete(key: unknown): FakeRequest {
    const request = new FakeRequest();
    queueMicrotask(() => {
      this.entry.data.delete(key);
      request.onsuccess?.(new Event('success'));
    });
    return request;
  }
}

/**
 * `oncomplete` se déclenche deux microtâches après la création, toujours
 * après la requête émise juste après `transaction(...)` (une microtâche) :
 * assez pour notre usage, une seule requête par transaction.
 */
class FakeTransaction {
  oncomplete: Listener = null;
  onerror: Listener = null;

  constructor(private readonly stores: Map<string, StoreEntry>) {
    queueMicrotask(() => queueMicrotask(() => this.oncomplete?.(new Event('complete'))));
  }

  objectStore(name: string): FakeObjectStore {
    const entry = this.stores.get(name);
    if (!entry) throw new Error(`magasin introuvable : ${name}`);
    return new FakeObjectStore(entry);
  }
}

class FakeDatabase {
  readonly objectStoreNames = { contains: (name: string) => this.stores.has(name) };

  constructor(private readonly stores: Map<string, StoreEntry>) {}

  createObjectStore(name: string, options?: { keyPath?: string }): FakeObjectStore {
    const entry: StoreEntry = { keyPath: options?.keyPath, data: new Map() };
    this.stores.set(name, entry);
    return new FakeObjectStore(entry);
  }

  transaction(): FakeTransaction {
    return new FakeTransaction(this.stores);
  }
}

/** Installe une fausse `indexedDB` globale, base vide. */
export function installFakeIndexedDb(): void {
  const stores = new Map<string, StoreEntry>();
  const db = new FakeDatabase(stores);
  const fakeFactory = {
    open(): FakeOpenRequest {
      const request = new FakeOpenRequest();
      queueMicrotask(() => {
        request.result = db;
        request.onupgradeneeded?.(new Event('upgradeneeded'));
        request.onsuccess?.(new Event('success'));
      });
      return request;
    },
  };
  (globalThis as { indexedDB?: unknown }).indexedDB = fakeFactory;
}

export function uninstallFakeIndexedDb(): void {
  delete (globalThis as { indexedDB?: unknown }).indexedDB;
}
