import {
  BlockedReason,
  MAX_INPUT_CHARS,
  NormalizeResponse,
} from '../src/app/core/ai/normalize.contract';
import { UpstreamError, classifyRefusal } from '../src/app/core/ai/refusal';
import { SYSTEM_PROMPT } from '../src/app/core/ai/prompt';

/**
 * `POST /api/normalize` — remet un tutoriel collé au format canonique.
 *
 * Seule partie de l'application qui parle au réseau. Elle détient la clé API,
 * qui ne quitte jamais le serveur. Tout le reste (découpage, état, persistance)
 * continue de tourner dans le navigateur, y compris quand cet endpoint est
 * indisponible : la normalisation est un confort, jamais un passage obligé.
 */

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_OUTPUT_TOKENS = 8_000;
const UPSTREAM = 'https://api.anthropic.com/v1/messages';

/**
 * Dernier blocage connu, pour éviter de rappeler l'API alors qu'on sait
 * qu'elle refusera. Mémoire d'instance chaude uniquement : Vercel peut créer
 * plusieurs instances et les recycler à tout moment. C'est une économie
 * opportuniste, jamais une garantie — l'autorité reste la réponse de l'API.
 */
let blockedUntil: { at: number; reason: BlockedReason; resumesAt: string | null } | null = null;

function json(body: NormalizeResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ status: 'error', reason: 'upstream' }, 405);
  }

  const key = process.env['ANTHROPIC_API_KEY'];
  if (!key) return json({ status: 'error', reason: 'misconfigured' }, 500);

  let body: { text?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ status: 'error', reason: 'empty' }, 400);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const locale = body.locale === 'en' ? 'en' : 'fr';

  if (!text) return json({ status: 'error', reason: 'empty' }, 400);
  if (text.length > MAX_INPUT_CHARS) return json({ status: 'error', reason: 'too_large' }, 413);

  if (blockedUntil && Date.now() < blockedUntil.at) {
    return json(
      { status: 'blocked', reason: blockedUntil.reason, resumesAt: blockedUntil.resumesAt },
      429,
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_PROMPT(locale),
        messages: [{ role: 'user', content: text }],
      }),
    });
  } catch {
    return json({ status: 'error', reason: 'upstream' }, 502);
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return json({ status: 'error', reason: 'misconfigured' }, 500);
  }

  if (upstream.status === 429 || upstream.status === 400) {
    const payload = (await upstream.json().catch(() => ({}))) as UpstreamError;
    const { reason, resumesAt } = classifyRefusal(
      upstream.status,
      payload,
      upstream.headers.get('retry-after'),
      new Date(),
    );
    // Une limite par minute se recharge vite : on ne verrouille que jusqu'à
    // l'échéance annoncée, et au plus une heure pour ne pas rester bloqué sur
    // une date lointaine mal lue.
    const until = resumesAt ? Date.parse(resumesAt) : Date.now() + 60_000;
    blockedUntil = { at: Math.min(until, Date.now() + 3_600_000), reason, resumesAt };
    return json({ status: 'blocked', reason, resumesAt }, 429);
  }

  if (!upstream.ok) return json({ status: 'error', reason: 'upstream' }, 502);

  blockedUntil = null;

  const payload = (await upstream.json().catch(() => null)) as {
    content?: { type?: string; text?: string }[];
  } | null;

  const normalized = (payload?.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('')
    .trim();

  if (!normalized) return json({ status: 'error', reason: 'upstream' }, 502);

  return json({ status: 'ok', text: normalized }, 200);
}
