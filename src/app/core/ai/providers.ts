/**
 * Fournisseurs de modèle utilisables avec la clé de la personne (BYOK).
 *
 * L'appel part **du navigateur**, directement chez le fournisseur : la clé ne
 * transite par aucun serveur du site, et rien n'est facturé au site. C'est le
 * seul montage qui garantit un coût nul quel que soit le trafic.
 *
 * Contrepartie à dire clairement : une clé stockée dans le navigateur est
 * lisible par tout script de la page. C'est acceptable parce que c'est la clé
 * de la personne, sur son appareil, et qu'elle peut la révoquer — pas parce
 * que c'est sans risque.
 */
export type ProviderId = 'anthropic' | 'openai' | 'perplexity';

export interface Provider {
  readonly id: ProviderId;
  readonly label: string;
  /** Point d'entrée de l'API, appelé depuis le navigateur. */
  readonly endpoint: string;
  /** Origine à autoriser dans la CSP. */
  readonly origin: string;
  readonly model: string;
  /** Où créer la clé, et à quoi ressemble son préfixe. */
  readonly console: string;
  readonly keyPrefix: string;
  /** Vrai si le fournisseur suit le format de l'API Messages d'Anthropic. */
  readonly messagesApi: boolean;
}

export const PROVIDERS: readonly Provider[] = [
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    endpoint: 'https://api.anthropic.com/v1/messages',
    origin: 'https://api.anthropic.com',
    model: 'claude-haiku-4-5-20251001',
    console: 'https://platform.claude.com/settings/keys',
    keyPrefix: 'sk-ant-',
    messagesApi: true,
  },
  {
    id: 'openai',
    label: 'ChatGPT (OpenAI)',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    origin: 'https://api.openai.com',
    model: 'gpt-4.1-mini',
    console: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
    messagesApi: false,
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    origin: 'https://api.perplexity.ai',
    model: 'sonar',
    console: 'https://www.perplexity.ai/account/api/keys',
    keyPrefix: 'pplx-',
    messagesApi: false,
  },
];

export function providerById(id: string): Provider | null {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

/** Corps de requête, selon que le fournisseur suit Anthropic ou OpenAI. */
export function requestBody(provider: Provider, system: string, text: string): unknown {
  if (provider.messagesApi) {
    return {
      model: provider.model,
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: text }],
    };
  }
  return {
    model: provider.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ],
  };
}

export function requestHeaders(provider: Provider, key: string): Record<string, string> {
  if (provider.messagesApi) {
    return {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      // Obligatoire pour un appel depuis une page web. L'en-tête s'appelle
      // « dangerous » parce qu'il expose la clé au navigateur : ici, c'est
      // assumé, la clé appartient à la personne.
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }
  return { 'content-type': 'application/json', authorization: `Bearer ${key}` };
}

/** Extrait le texte de la réponse, quel que soit le format du fournisseur. */
export function readReply(provider: Provider, payload: unknown): string {
  const data = payload as {
    content?: { type?: string; text?: string }[];
    choices?: { message?: { content?: string } }[];
  };
  if (provider.messagesApi) {
    return (data.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('')
      .trim();
  }
  return (data.choices?.[0]?.message?.content ?? '').trim();
}
