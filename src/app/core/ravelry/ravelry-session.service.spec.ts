import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../analytics/analytics.service';
import { I18nService } from '../i18n/i18n.service';
import { BrowserLocation } from '../platform/browser-location.service';
import { ProjectStoreService } from '../storage/project-store.service';
import { readSession, writeSession } from '../storage/ravelry-session-db';
import { installFakeIndexedDb, uninstallFakeIndexedDb } from '../storage/testing/fake-indexed-db';
import { RAVELRY_URL_TOKEN } from './ravelry-access';
import { RAVELRY_CLIENT, RavelryClient } from './ravelry-client.token';
import { RAVELRY_CLIENT_ID_TOKEN } from './ravelry-connection-config';
import { RavelrySession } from './ravelry-session.service';
import type { RavelryRefusal, RavelryResult, RavelryTokens } from './ravelry.model';

const ORIGIN = 'https://patternreader.com';
const MIN = 60_000;
const FLOW_KEY = 'fil.ravelry.flow';

const TOKENS: RavelryTokens = { accessToken: 'at-1', refreshToken: 'rt-1', expiresIn: 3600 };
const ok = <T>(data: T): RavelryResult<T> => ({ ok: true, data });
const refus = (raison: RavelryRefusal): RavelryResult<never> => ({ ok: false, raison });

interface Monte {
  session: RavelrySession;
  exchangeCode: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  redirect: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  db: () => Promise<IDBDatabase | null>;
}

function monter(
  options: {
    clientId?: string;
    exchange?: RavelryResult<RavelryTokens>;
    refresh?: RavelryResult<RavelryTokens>;
  } = {},
): Monte {
  const exchangeCode = vi.fn(async () => options.exchange ?? ok(TOKENS));
  const refresh = vi.fn(
    async () =>
      options.refresh ?? ok({ accessToken: 'at-2', refreshToken: 'rt-2', expiresIn: 3600 }),
  );
  const redirect = vi.fn();
  const track = vi.fn();
  const client = { exchangeCode, refresh } as unknown as RavelryClient;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: RAVELRY_CLIENT, useValue: client },
      { provide: RAVELRY_URL_TOKEN, useValue: 'https://fil-ia.example/ravelry' },
      { provide: RAVELRY_CLIENT_ID_TOKEN, useValue: options.clientId ?? 'client-public' },
      { provide: AnalyticsService, useValue: { track } },
      {
        provide: BrowserLocation,
        useValue: { origin: () => ORIGIN, redirect, search: () => '', replaceUrl: () => undefined },
      },
    ],
  });
  const store = TestBed.inject(ProjectStoreService);
  return {
    session: TestBed.inject(RavelrySession),
    exchangeCode,
    refresh,
    redirect,
    track,
    db: () => store.db(),
  };
}

/** Départ vers Ravelry, puis l'adresse de retour correspondante. */
async function partir(m: Monte, returnTo = '/find-a-pattern?q=sapin&craft=crochet') {
  expect(await m.session.begin(returnTo)).toBe(true);
  const url = new URL(m.redirect.mock.calls.at(-1)![0] as string);
  const state = url.searchParams.get('state')!;
  return { url, state, retour: (extra = '') => `?code=code-1&state=${state}${extra}` };
}

describe('connexion à Ravelry (OAuth 2.1, PKCE)', () => {
  beforeEach(() => {
    installFakeIndexedDb();
    sessionStorage.clear();
  });
  afterEach(() => {
    uninstallFakeIndexedDb();
    vi.useRealTimers();
  });

  describe('départ', () => {
    it('redirige vers l’autorisation de Ravelry avec PKCE S256, state et le seul scope offline_access', async () => {
      const m = monter();
      TestBed.inject(I18nService).setLocale('fr');
      const { url, state } = await partir(m);
      expect(`${url.origin}${url.pathname}`).toBe('https://auth.ravelry.com/oauth2/auth');
      const p = url.searchParams;
      expect(p.get('response_type')).toBe('code');
      expect(p.get('client_id')).toBe('client-public');
      expect(p.get('redirect_uri')).toBe(`${ORIGIN}/ravelry-callback`);
      expect(p.get('scope')).toBe('offline_access');
      expect(p.get('code_challenge_method')).toBe('S256');
      expect(state.length).toBeGreaterThanOrEqual(16);

      // Le challenge est bien le SHA-256 du verifier gardé pour le retour.
      const flow = JSON.parse(sessionStorage.getItem(FLOW_KEY)!);
      expect(flow.verifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
      const hash = new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(flow.verifier)),
      );
      const attendu = btoa(String.fromCharCode(...hash))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      expect(p.get('code_challenge')).toBe(attendu);
      expect(flow.state).toBe(state);
      expect(flow.locale).toBe('fr');
      expect(flow.returnTo).toBe('/find-a-pattern?q=sapin&craft=crochet');
      // Le verifier ne part jamais dans l'adresse.
      expect(url.toString()).not.toContain(flow.verifier);
    });

    it('chaque départ a son verifier et son state', async () => {
      const m = monter();
      const a = await partir(m);
      const flowA = JSON.parse(sessionStorage.getItem(FLOW_KEY)!);
      const b = await partir(m);
      const flowB = JSON.parse(sessionStorage.getItem(FLOW_KEY)!);
      expect(a.state).not.toBe(b.state);
      expect(flowA.verifier).not.toBe(flowB.verifier);
    });

    it('sans identifiant public, la connexion est indisponible : aucune redirection', async () => {
      const m = monter({ clientId: '' });
      expect(await m.session.begin('/')).toBe(false);
      expect(m.redirect).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(FLOW_KEY)).toBeNull();
    });
  });

  describe('retour', () => {
    it('vérifie state, échange le code avec le verifier, garde les jetons sur l’appareil et efface le départ', async () => {
      const m = monter();
      TestBed.inject(I18nService).setLocale('fr');
      const { retour } = await partir(m);
      const verifier = JSON.parse(sessionStorage.getItem(FLOW_KEY)!).verifier;

      const out = await m.session.complete(retour());
      expect(out).toEqual({
        ok: true,
        returnTo: '/find-a-pattern?q=sapin&craft=crochet',
        locale: 'fr',
      });
      expect(m.exchangeCode).toHaveBeenCalledWith('https://fil-ia.example/ravelry', {
        code: 'code-1',
        verifier,
        redirectUri: `${ORIGIN}/ravelry-callback`,
      });
      expect(sessionStorage.getItem(FLOW_KEY)).toBeNull();
      expect(m.session.connected()).toBe(true);
      expect(m.track).toHaveBeenCalledWith('ravelry_connected');
      // Aucune donnée dans la mesure.
      expect(m.track.mock.calls.every((c) => c.length === 1)).toBe(true);

      // Relu en IndexedDB, pas seulement en mémoire.
      await vi.waitFor(async () => {
        const stocke = await readSession(await m.db());
        expect(stocke).toMatchObject({ accessToken: 'at-1', refreshToken: 'rt-1' });
        expect(stocke!.expiresAt).toBeGreaterThan(Date.now() + 59 * MIN);
      });
      // Jamais dans un stockage lisible à chaque visite ni dans l'adresse.
      expect(JSON.stringify({ ...localStorage })).not.toContain('at-1');
      expect(JSON.stringify({ ...sessionStorage })).not.toContain('at-1');
    });

    it('un state falsifié est refusé : aucun échange, rien d’enregistré, départ effacé', async () => {
      const m = monter();
      await partir(m);
      const out = await m.session.complete('?code=code-1&state=pas-le-bon');
      expect(out).toMatchObject({ ok: false, reason: 'state' });
      expect(m.exchangeCode).not.toHaveBeenCalled();
      expect(m.session.connected()).toBe(false);
      expect(sessionStorage.getItem(FLOW_KEY)).toBeNull();
      expect(await readSession(await m.db())).toBeNull();
    });

    it.each([
      ['sans state', '?code=code-1'],
      ['avec un state vide', '?code=code-1&state='],
    ])('un retour %s est refusé', async (_n, search) => {
      const m = monter();
      await partir(m);
      expect(await m.session.complete(search)).toMatchObject({ ok: false, reason: 'state' });
      expect(m.exchangeCode).not.toHaveBeenCalled();
    });

    it('un retour sans départ (autre onglet, stockage vidé) est refusé', async () => {
      const m = monter();
      expect(await m.session.complete('?code=c&state=s')).toEqual({
        ok: false,
        reason: 'state',
        locale: null,
      });
      expect(m.exchangeCode).not.toHaveBeenCalled();
    });

    it('un départ illisible ou de forme inattendue est refusé', async () => {
      for (const brut of ['pas du json', '{"state":1}', '[]', 'x'.repeat(2001)]) {
        const m = monter();
        sessionStorage.setItem(FLOW_KEY, brut);
        expect(await m.session.complete('?code=c&state=s')).toMatchObject({ reason: 'state' });
        expect(m.exchangeCode).not.toHaveBeenCalled();
      }
    });

    it('le départ ne sert qu’une fois : rejouer le même retour échoue', async () => {
      const m = monter();
      const { retour } = await partir(m);
      expect((await m.session.complete(retour())).ok).toBe(true);
      expect(await m.session.complete(retour())).toMatchObject({ ok: false, reason: 'state' });
      expect(m.exchangeCode).toHaveBeenCalledTimes(1);
    });

    it('un aller-retour de plus de 10 minutes est expiré ; à 9 min 59 il passe encore', async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
      vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
      const m = monter();
      const lent = await partir(m);
      vi.setSystemTime(new Date('2026-11-23T10:10:01Z'));
      expect(await m.session.complete(lent.retour())).toMatchObject({ ok: false, reason: 'state' });
      expect(m.exchangeCode).not.toHaveBeenCalled();

      const m2 = monter();
      const vite = await partir(m2);
      vi.setSystemTime(new Date('2026-11-23T10:20:00Z'));
      expect((await m2.session.complete(vite.retour())).ok).toBe(true);
    });

    it('un refus d’accès est dit comme tel, sans échange', async () => {
      const m = monter();
      const { state } = await partir(m);
      const out = await m.session.complete(`?error=access_denied&state=${state}`);
      expect(out).toMatchObject({ ok: false, reason: 'denied' });
      expect(m.exchangeCode).not.toHaveBeenCalled();
      expect(m.session.connected()).toBe(false);
    });

    it('un refus d’accès avec un state falsifié reste une erreur de vérification', async () => {
      const m = monter();
      await partir(m);
      expect(await m.session.complete('?error=access_denied&state=faux')).toMatchObject({
        reason: 'state',
      });
    });

    it('une autre erreur de Ravelry est un échec', async () => {
      const m = monter();
      const { state } = await partir(m);
      expect(await m.session.complete(`?error=server_error&state=${state}`)).toMatchObject({
        reason: 'failed',
      });
    });

    it.each([
      ['code absent', (s: string) => `?state=${s}`],
      ['code vide', (s: string) => `?code=&state=${s}`],
      ['code de 513 caractères', (s: string) => `?code=${'a'.repeat(513)}&state=${s}`],
    ])('%s : échec, sans échange', async (_n, fabrique) => {
      const m = monter();
      const { state } = await partir(m);
      expect(await m.session.complete(fabrique(state))).toMatchObject({ reason: 'failed' });
      expect(m.exchangeCode).not.toHaveBeenCalled();
    });

    it.each<[RavelryRefusal, string]>([
      ['session-expiree', 'failed'],
      ['requete', 'failed'],
      ['reseau', 'unavailable'],
      ['delai', 'unavailable'],
      ['indisponible', 'unavailable'],
      ['quota-jour', 'unavailable'],
    ])('l’échange refusé (%s) : %s, aucune connexion', async (raison, reason) => {
      const m = monter({ exchange: refus(raison) });
      const { retour } = await partir(m);
      expect(await m.session.complete(retour())).toMatchObject({ ok: false, reason });
      expect(m.session.connected()).toBe(false);
      expect(m.track).not.toHaveBeenCalled();
    });

    it.each([
      '//evil.example/x',
      'https://evil.example/',
      'javascript:alert(1)',
      '/\\evil.example',
      'sans-barre',
      `/${'a'.repeat(300)}`,
      '/page"onload="x',
    ])('une page de retour qui n’est pas un chemin du site (%s) est ignorée', async (cible) => {
      const m = monter();
      sessionStorage.setItem(
        FLOW_KEY,
        JSON.stringify({
          state: 's',
          verifier: 'v'.repeat(43),
          locale: 'en',
          returnTo: cible,
          at: Date.now(),
        }),
      );
      const out = await m.session.complete('?code=c&state=s');
      expect(out).toMatchObject({ ok: true, returnTo: null });
    });
  });

  describe('jetons sur l’appareil', () => {
    it('une connexion enregistrée est retrouvée à la visite suivante', async () => {
      const m = monter();
      await writeSession(await m.db(), {
        accessToken: 'at-9',
        refreshToken: 'rt-9',
        expiresAt: Date.now() + 30 * MIN,
      });
      expect(m.session.loaded()).toBe(false);
      await m.session.load();
      expect(m.session.loaded()).toBe(true);
      expect(m.session.connected()).toBe(true);
      expect(await m.session.accessToken()).toBe('at-9');
    });

    it('sans connexion enregistrée, rien n’est connecté et aucun jeton n’est rendu', async () => {
      const m = monter();
      await m.session.load();
      expect(m.session.connected()).toBe(false);
      expect(await m.session.accessToken()).toBeNull();
    });

    it('rien ne se lit ni ne se connecte hors navigateur', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
      const session = TestBed.inject(RavelrySession);
      await session.load();
      expect(session.connected()).toBe(false);
      expect(await session.begin('/')).toBe(false);
    });
  });

  describe('renouvellement', () => {
    async function connectee(m: Monte, expiresInMin: number, refreshToken: string | null = 'rt-1') {
      await writeSession(await m.db(), {
        accessToken: 'at-1',
        refreshToken,
        expiresAt: Date.now() + expiresInMin * MIN,
      });
      await m.session.load();
    }

    it('renouvelle le jeton à moins de 5 minutes de l’expiration, et l’enregistre', async () => {
      const m = monter();
      await connectee(m, 4);
      expect(await m.session.accessToken()).toBe('at-2');
      expect(m.refresh).toHaveBeenCalledTimes(1);
      expect(m.refresh).toHaveBeenCalledWith('https://fil-ia.example/ravelry', 'rt-1');
      await vi.waitFor(async () =>
        expect(await readSession(await m.db())).toMatchObject({
          accessToken: 'at-2',
          refreshToken: 'rt-2',
        }),
      );
    });

    it('ne renouvelle pas un jeton encore valable plus de 5 minutes', async () => {
      const m = monter();
      await connectee(m, 6);
      expect(await m.session.accessToken()).toBe('at-1');
      expect(m.refresh).not.toHaveBeenCalled();
    });

    it('garde l’ancien jeton de rafraîchissement quand Ravelry n’en donne pas de nouveau', async () => {
      const m = monter({
        refresh: ok({ accessToken: 'at-2', refreshToken: null, expiresIn: 3600 }),
      });
      await connectee(m, 1);
      await m.session.accessToken();
      await vi.waitFor(async () =>
        expect(await readSession(await m.db())).toMatchObject({
          accessToken: 'at-2',
          refreshToken: 'rt-1',
        }),
      );
    });

    it('renouvelle tout seul 5 minutes avant l’expiration, sans qu’on le demande', async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
      vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
      const m = monter();
      await connectee(m, 60);
      await vi.advanceTimersByTimeAsync(54 * MIN);
      expect(m.refresh).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1 * MIN + 1000);
      expect(m.refresh).toHaveBeenCalledTimes(1);
      // Le suivant est reprogrammé d'après le nouveau jeton (1 h) : un seul appel pour l'instant.
      await vi.advanceTimersByTimeAsync(10 * MIN);
      expect(m.refresh).toHaveBeenCalledTimes(1);
    });

    it('des appels simultanés ne font qu’un renouvellement', async () => {
      const m = monter();
      await connectee(m, 1);
      const jetons = await Promise.all([
        m.session.accessToken(),
        m.session.accessToken(),
        m.session.accessToken(),
      ]);
      expect(jetons).toEqual(['at-2', 'at-2', 'at-2']);
      expect(m.refresh).toHaveBeenCalledTimes(1);
    });

    it('un renouvellement refusé efface la connexion et la dit', async () => {
      const m = monter({ refresh: refus('session-expiree') });
      await connectee(m, 1);
      expect(await m.session.accessToken()).toBeNull();
      expect(m.session.connected()).toBe(false);
      expect(m.session.expired()).toBe(true);
      await vi.waitFor(async () => expect(await readSession(await m.db())).toBeNull());
    });

    it('sans jeton de rafraîchissement, un jeton expiré perd la connexion', async () => {
      const m = monter();
      await connectee(m, 1, null);
      expect(await m.session.accessToken()).toBeNull();
      expect(m.session.expired()).toBe(true);
      expect(m.refresh).not.toHaveBeenCalled();
    });

    it('un réseau coupé ne déconnecte pas tant que le jeton vaut encore', async () => {
      const m = monter({ refresh: refus('reseau') });
      await connectee(m, 3);
      expect(await m.session.accessToken()).toBe('at-1');
      expect(m.session.connected()).toBe(true);
      expect(m.session.expired()).toBe(false);
    });

    it('un réseau coupé alors que le jeton a expiré perd la connexion', async () => {
      const m = monter({ refresh: refus('reseau') });
      await connectee(m, -1);
      expect(await m.session.accessToken()).toBeNull();
      expect(m.session.expired()).toBe(true);
    });

    describe('un 401 de Ravelry', () => {
      it('provoque un seul renouvellement et rend le nouveau jeton', async () => {
        const m = monter();
        await connectee(m, 30);
        expect(await m.session.refreshAfterRejection('at-1')).toBe('at-2');
        expect(m.refresh).toHaveBeenCalledTimes(1);
      });

      it('si un autre appel a déjà renouvelé, rend le jeton courant sans renouveler encore', async () => {
        const m = monter();
        await connectee(m, 30);
        await m.session.refreshAfterRejection('at-1');
        expect(await m.session.refreshAfterRejection('at-1')).toBe('at-2');
        expect(m.refresh).toHaveBeenCalledTimes(1);
      });

      it.each<RavelryRefusal>(['session-expiree', 'reseau', 'indisponible'])(
        'un renouvellement en échec (%s) déconnecte, même si le jeton n’avait pas expiré',
        async (raison) => {
          const m = monter({ refresh: refus(raison) });
          await connectee(m, 30);
          expect(await m.session.refreshAfterRejection('at-1')).toBeNull();
          expect(m.session.connected()).toBe(false);
          expect(m.session.expired()).toBe(true);
          expect(m.refresh).toHaveBeenCalledTimes(1);
          await vi.waitFor(async () => expect(await readSession(await m.db())).toBeNull());
        },
      );

      it('sans connexion, ne fait rien', async () => {
        const m = monter();
        await m.session.load();
        expect(await m.session.refreshAfterRejection('x')).toBeNull();
        expect(m.refresh).not.toHaveBeenCalled();
      });
    });
  });

  describe('déconnexion', () => {
    it('efface tout localement, relu en IndexedDB, et le dit à la mesure sans donnée', async () => {
      const m = monter();
      const { retour } = await partir(m);
      await m.session.complete(retour());
      await vi.waitFor(async () => expect(await readSession(await m.db())).not.toBeNull());

      const fait = m.session.disconnect();
      // L'état est vidé avant d'attendre le stockage : aucun effet ne peut réécrire la connexion.
      expect(m.session.connected()).toBe(false);
      expect(await fait).toBe(true);
      await vi.waitFor(async () => expect(await readSession(await m.db())).toBeNull());
      expect(await m.session.accessToken()).toBeNull();
      expect(m.track).toHaveBeenLastCalledWith('ravelry_disconnected');
    });

    it('arrête le renouvellement automatique', async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
      vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
      const m = monter();
      await writeSession(await m.db(), {
        accessToken: 'at-1',
        refreshToken: 'rt-1',
        expiresAt: Date.now() + 60 * MIN,
      });
      await m.session.load();
      await m.session.disconnect();
      await vi.advanceTimersByTimeAsync(2 * 60 * MIN);
      expect(m.refresh).not.toHaveBeenCalled();
    });

    it('efface aussi le message « connexion expirée »', async () => {
      const m = monter({ refresh: refus('session-expiree') });
      await writeSession(await m.db(), {
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: Date.now() + MIN,
      });
      await m.session.load();
      await m.session.accessToken();
      expect(m.session.expired()).toBe(true);
      await m.session.disconnect();
      expect(m.session.expired()).toBe(false);
    });
  });
});
