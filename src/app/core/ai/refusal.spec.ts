import { describe, expect, it } from 'vitest';
import { classifyRefusal, parseResumeDate, startOfNextMonthUtc } from './refusal';

const NOW = new Date('2026-09-08T10:30:00Z');

describe('parseResumeDate', () => {
  it('lit la date de reprise annoncée dans le message', () => {
    const message =
      'You have reached your API usage limits: your organization has crossed its monthly ' +
      'API usage threshold. You will regain access on 2026-10-01 at 00:00 UTC.';
    expect(parseResumeDate(message)).toBe('2026-10-01T00:00:00.000Z');
  });

  it('rend null quand le message ne contient pas de date', () => {
    expect(parseResumeDate('Number of request tokens has exceeded your rate limit')).toBeNull();
  });
});

describe('startOfNextMonthUtc', () => {
  it('bascule sur le mois suivant', () => {
    expect(startOfNextMonthUtc(NOW)).toBe('2026-10-01T00:00:00.000Z');
  });

  it('franchit la fin d’année', () => {
    expect(startOfNextMonthUtc(new Date('2026-12-20T23:00:00Z'))).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('classifyRefusal', () => {
  it('traite un 429 avec retry-after comme une limite par minute', () => {
    const refusal = classifyRefusal(429, { error: { type: 'rate_limit_error' } }, '42', NOW);
    expect(refusal.reason).toBe('rate_limit');
    expect(refusal.resumesAt).toBe('2026-09-08T10:30:42.000Z');
  });

  it('distingue le plafond de palier par son error_code, pas par son statut', () => {
    const refusal = classifyRefusal(
      429,
      {
        error: {
          type: 'rate_limit_error',
          message: 'You will regain access on 2026-10-01 at 00:00 UTC.',
          details: { error_code: 'enforced_spend_limit_reached' },
        },
      },
      null,
      NOW,
    );
    expect(refusal.reason).toBe('spend_cap');
    expect(refusal.resumesAt).toBe('2026-10-01T00:00:00.000Z');
  });

  it('retombe sur le 1er du mois quand le plafond de palier n’annonce pas de date', () => {
    const refusal = classifyRefusal(
      429,
      { error: { details: { error_code: 'enforced_spend_limit_reached' } } },
      null,
      NOW,
    );
    expect(refusal.resumesAt).toBe('2026-10-01T00:00:00.000Z');
  });

  it('traite un 400 comme un plafond fixé manuellement', () => {
    const refusal = classifyRefusal(
      400,
      {
        error: {
          type: 'invalid_request_error',
          message: 'You have reached your specified API usage limits.',
        },
      },
      null,
      NOW,
    );
    expect(refusal.reason).toBe('spend_limit');
    expect(refusal.resumesAt).toBeNull();
  });

  it('accepte un 429 sans retry-after exploitable', () => {
    const refusal = classifyRefusal(429, {}, null, NOW);
    expect(refusal.reason).toBe('rate_limit');
    expect(refusal.resumesAt).toBeNull();
  });
});
