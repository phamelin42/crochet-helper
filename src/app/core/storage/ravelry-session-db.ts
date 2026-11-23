/**
 * Jetons de connexion Ravelry (fiche 62), sur l'appareil, dans le magasin
 * `ravelry-session` de la base `fil` (v4). Un seul enregistrement. Fonctions à
 * part, chargées avec la connexion : le lecteur n'en paie rien. Cette base n'est
 * lue ni par la sauvegarde exportée ni par aucun lien partagé.
 */
const STORE = 'ravelry-session';
const KEY = 'session';

export interface StoredRavelrySession {
  readonly id: typeof KEY;
  readonly accessToken: string;
  readonly refreshToken: string | null;
  /** Millisecondes depuis 1970. */
  readonly expiresAt: number;
}

const MAX_TOKEN = 4096;

function valid(v: unknown): v is StoredRavelrySession {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    s['id'] === KEY &&
    typeof s['accessToken'] === 'string' &&
    s['accessToken'].length > 0 &&
    s['accessToken'].length <= MAX_TOKEN &&
    (s['refreshToken'] === null ||
      (typeof s['refreshToken'] === 'string' &&
        s['refreshToken'].length > 0 &&
        s['refreshToken'].length <= MAX_TOKEN)) &&
    typeof s['expiresAt'] === 'number' &&
    Number.isFinite(s['expiresAt'])
  );
}

/** La session enregistrée ; `null` si absente, illisible ou de forme inattendue. */
export function readSession(db: IDBDatabase | null): Promise<StoredRavelrySession | null> {
  if (!db) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(valid(request.result) ? request.result : null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Une seule transaction ; `true` seulement une fois validée. */
function write(db: IDBDatabase | null, work: (store: IDBObjectStore) => void): Promise<boolean> {
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

export const writeSession = (
  db: IDBDatabase | null,
  session: Omit<StoredRavelrySession, 'id'>,
): Promise<boolean> => write(db, (store) => store.put({ id: KEY, ...session }));

export const clearSession = (db: IDBDatabase | null): Promise<boolean> =>
  write(db, (store) => store.clear());
