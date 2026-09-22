/**
 * Fausse IndexedDB minimale pour les tests : jsdom n'implémente pas l'API, et
 * la fiche interdit toute dépendance nouvelle. Couvre uniquement ce dont
 * `ProjectStoreService` se sert — `put`, `getAll`, `delete`, transactions
 * atomiques et annulation — avec des
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
  constructor(
    private readonly entry: StoreEntry,
    private readonly tx: FakeTransaction,
  ) {}

  put(value: unknown): FakeRequest {
    const request = new FakeRequest();
    const key = this.entry.keyPath
      ? (value as Record<string, unknown>)[this.entry.keyPath]
      : undefined;
    this.tx.stage(() => this.entry.data.set(key, value));
    queueMicrotask(() => {
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
    this.tx.stage(() => this.entry.data.delete(key));
    queueMicrotask(() => request.onsuccess?.(new Event('success')));
    return request;
  }
}

/**
 * Les écritures sont mises de côté et appliquées ensemble à la validation,
 * deux microtâches après la création — après les requêtes émises juste après
 * `transaction(...)`. Si `failWrites` est levé, la transaction est annulée
 * (`abort`, comme un quota dépassé) et aucune écriture n'est appliquée.
 */
class FakeTransaction {
  oncomplete: Listener = null;
  onerror: Listener = null;
  onabort: Listener = null;
  private readonly staged: (() => void)[] = [];

  constructor(
    private readonly stores: Map<string, StoreEntry>,
    private readonly control: FakeControl,
  ) {
    queueMicrotask(() =>
      queueMicrotask(() => {
        if (this.staged.length && this.control.failWrites) {
          this.onabort?.(new Event('abort'));
          return;
        }
        this.staged.forEach((write) => write());
        this.oncomplete?.(new Event('complete'));
      }),
    );
  }

  stage(write: () => void): void {
    this.staged.push(write);
  }

  objectStore(name: string): FakeObjectStore {
    const entry = this.stores.get(name);
    if (!entry) throw new Error(`magasin introuvable : ${name}`);
    return new FakeObjectStore(entry, this);
  }
}

/** Commandes de test : simuler un quota dépassé sur les écritures. */
export interface FakeControl {
  failWrites: boolean;
}

class FakeDatabase {
  readonly objectStoreNames = { contains: (name: string) => this.stores.has(name) };

  onversionchange: Listener = null;

  constructor(
    private readonly stores: Map<string, StoreEntry>,
    private readonly control: FakeControl,
  ) {}

  createObjectStore(name: string, options?: { keyPath?: string }): void {
    this.stores.set(name, { keyPath: options?.keyPath, data: new Map() });
  }

  transaction(): FakeTransaction {
    return new FakeTransaction(this.stores, this.control);
  }

  close(): void {
    /* rien à libérer */
  }
}

/** Installe une fausse `indexedDB` globale, base vide, et renvoie ses commandes. */
export function installFakeIndexedDb(): FakeControl {
  const control: FakeControl = { failWrites: false };
  const stores = new Map<string, StoreEntry>();
  const db = new FakeDatabase(stores, control);
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
  return control;
}

export function uninstallFakeIndexedDb(): void {
  delete (globalThis as { indexedDB?: unknown }).indexedDB;
}
