/**
 * Encode un patron dans un fragment d'URL partageable, et le décode à la
 * lecture. Compressé avec `CompressionStream('deflate-raw')` quand l'API est
 * disponible, sinon replié sur du base64url brut — un octet de préfixe indique
 * lequel des deux formats a servi, pour que le décodage n'ait pas à deviner.
 */

const FORMAT_COMPRESSED = '1';
const FORMAT_RAW = '0';

/**
 * Plafonds de décodage. Le lien vient d'un tiers : quelques kilo-octets
 * compressés peuvent se décompresser en centaines de mégaoctets (« bombe de
 * décompression ») et faire tomber l'onglet. Un vrai patron tient largement
 * sous 256 Ko de texte, et un lien utile sous 16 000 caractères.
 */
const MAX_ENCODED_LENGTH = 16_000;
const MAX_DECODED_BYTES = 256_000;

class TooLargeError extends Error {}

function supportsCompression(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

/** Un flux à un seul bloc — sert d'entrée à `Compression`/`DecompressionStream`
 *  sans passer par `Blob`, dont l'implémentation de test n'a pas `.stream()`. */
function toReadableStream(bytes: Uint8Array<ArrayBuffer>): ReadableStream<Uint8Array<ArrayBuffer>> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function compress(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = toReadableStream(bytes).pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Décompresse en s'arrêtant dès que `MAX_DECODED_BYTES` est dépassé. */
async function decompress(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const reader = toReadableStream(bytes)
    .pipeThrough(new DecompressionStream('deflate-raw'))
    .getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DECODED_BYTES) {
      await reader.cancel();
      throw new TooLargeError();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Compresse et encode un patron pour l'inclure dans un permalien. */
export async function encodePattern(source: string): Promise<string> {
  const bytes = new TextEncoder().encode(source);
  if (supportsCompression()) {
    return FORMAT_COMPRESSED + bytesToBase64Url(await compress(bytes));
  }
  return FORMAT_RAW + bytesToBase64Url(bytes);
}

/**
 * Décode le fragment d'un permalien. Le lien vient potentiellement d'un
 * tiers : toute entrée invalide renvoie `null`, jamais une exception.
 */
export async function decodePattern(encoded: string): Promise<string | null> {
  const format = encoded.at(0);
  if (format !== FORMAT_COMPRESSED && format !== FORMAT_RAW) return null;
  if (encoded.length > MAX_ENCODED_LENGTH) return null;
  try {
    const bytes = base64UrlToBytes(encoded.slice(1));
    const raw = format === FORMAT_COMPRESSED ? await decompress(bytes) : bytes;
    if (raw.length > MAX_DECODED_BYTES) return null;
    return new TextDecoder('utf-8', { fatal: true }).decode(raw);
  } catch {
    return null;
  }
}
