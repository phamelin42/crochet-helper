import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { RAVELRY_URL_TOKEN } from '../../../core/ravelry/ravelry-access';
import { RAVELRY_CLIENT, RavelryClient } from '../../../core/ravelry/ravelry-client.token';
import { RAVELRY_MODE_TOKEN, RavelryMode } from '../../../core/ravelry/ravelry-connection-config';
import { RavelrySession } from '../../../core/ravelry/ravelry-session.service';
import type {
  RavelryCard,
  RavelryDetail,
  RavelryResult,
  RavelrySearch,
} from '../../../core/ravelry/ravelry.model';
import { DiscoverStore } from './discover-store';

const BASE = 'https://fil-ia.example/ravelry';

function carte(id: number): RavelryCard {
  return {
    id,
    nom: `Patron ${id}`,
    designer: 'Cam',
    vignette: null,
    lien: `https://www.ravelry.com/patterns/library/p-${id}`,
  };
}
const page = (ids: number[], p: number, pages: number): RavelryResult<RavelrySearch> => ({
  ok: true,
  data: { patrons: ids.map(carte), page: p, pages },
});
const FICHE: RavelryDetail = {
  id: 7,
  nom: 'Sapin',
  designer: 'Cam',
  description: 'Texte',
  photos: [],
  craft: 'Crochet',
  poidsFil: null,
  difficulte: null,
  telechargement: null,
  source: null,
  lien: 'https://www.ravelry.com/patterns/library/sapin',
};

describe('DiscoverStore', () => {
  const track = vi.fn();
  let search: ReturnType<typeof vi.fn<RavelryClient['search']>>;
  let pattern: ReturnType<typeof vi.fn<RavelryClient['pattern']>>;

  function store(): DiscoverStore {
    TestBed.resetTestingModule();
    search = vi.fn<RavelryClient['search']>(async () => page([1, 2], 1, 2));
    pattern = vi.fn<RavelryClient['pattern']>(async () => ({ ok: true, data: FICHE }));
    TestBed.configureTestingModule({
      providers: [
        { provide: RAVELRY_URL_TOKEN, useValue: BASE },
        { provide: RAVELRY_MODE_TOKEN, useValue: 'ouvert' },
        { provide: RAVELRY_CLIENT, useValue: { search, pattern } },
        { provide: AnalyticsService, useValue: { track } },
      ],
    });
    return TestBed.inject(DiscoverStore);
  }

  beforeEach(() => track.mockClear());

  it('une recherche remplit la liste, passe par « loading » et mesure sans le terme', async () => {
    const s = store();
    const attente = s.search('christmas tree', 'crochet');
    expect(s.status()).toBe('loading');
    await attente;
    expect(s.status()).toBe('ok');
    expect(s.patrons().map((p) => p.id)).toEqual([1, 2]);
    expect(search).toHaveBeenCalledWith(
      BASE,
      { q: 'christmas tree', craft: 'crochet', page: 1 },
      null,
    );
    expect(track).toHaveBeenCalledWith('pattern_searched', { craft: 'crochet', resultats: '1-9' });
    expect(JSON.stringify(track.mock.calls)).not.toContain('christmas');
  });

  it.each([
    [0, '0'],
    [1, '1-9'],
    [9, '1-9'],
    [10, '10-19'],
    [19, '10-19'],
    [20, '20+'],
    [40, '20+'],
  ])('%i résultat(s) : tranche « %s »', async (n, tranche) => {
    const s = store();
    search.mockResolvedValue(
      page(
        Array.from({ length: n }, (_, i) => i + 1),
        1,
        1,
      ),
    );
    await s.search('a', 'knitting');
    expect(track).toHaveBeenCalledWith('pattern_searched', {
      craft: 'knitting',
      resultats: tranche,
    });
  });

  it('« voir plus » ajoute la page suivante sans doublon, jusqu’à la dernière', async () => {
    const s = store();
    await s.search('a', 'crochet');
    expect(s.hasMore()).toBe(true);
    search.mockResolvedValueOnce(page([2, 3], 2, 2));
    await s.more();
    expect(search).toHaveBeenLastCalledWith(BASE, { q: 'a', craft: 'crochet', page: 2 }, null);
    expect(s.patrons().map((p) => p.id)).toEqual([1, 2, 3]);
    expect(s.hasMore()).toBe(false);
    // Une page suivante n'est pas une nouvelle recherche : une seule mesure.
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('une erreur de page suivante garde les résultats déjà là et se réessaie', async () => {
    const s = store();
    await s.search('a', 'crochet');
    search.mockResolvedValueOnce({ ok: false, raison: 'reseau' });
    await s.more();
    expect(s.patrons()).toHaveLength(2);
    expect(s.moreError()).toBe('reseau');
    search.mockResolvedValueOnce(page([3], 2, 2));
    await s.more();
    expect(s.moreError()).toBeNull();
    expect(s.patrons()).toHaveLength(3);
  });

  it.each([
    'reseau',
    'delai',
    'trop-de-demandes',
    'quota-jour',
    'indisponible',
    'requete',
  ] as const)('refus « %s » : état d’erreur dit, liste vidée, réessai possible', async (raison) => {
    const s = store();
    search.mockResolvedValueOnce({ ok: false, raison, attente: 12 });
    await s.search('a', 'crochet');
    expect(s.status()).toBe('error');
    expect(s.error()).toBe(raison);
    expect(s.patrons()).toEqual([]);
    expect(track).not.toHaveBeenCalled();

    await s.retry();
    expect(s.status()).toBe('ok');
    expect(s.error()).toBeNull();
  });

  it('une réponse arrivée après une recherche plus récente est ignorée', async () => {
    const s = store();
    let finir!: (r: RavelryResult<RavelrySearch>) => void;
    search.mockImplementationOnce(() => new Promise((resolve) => (finir = resolve)));
    const premiere = s.search('ancienne', 'crochet');
    search.mockResolvedValueOnce(page([9], 1, 1));
    await s.search('récente', 'knitting');
    finir(page([1, 2, 3], 1, 1));
    await premiere;
    expect(s.q()).toBe('récente');
    expect(s.patrons().map((p) => p.id)).toEqual([9]);
  });

  it('chercher la même chose qu’avant et déjà affichée ne relance rien', async () => {
    const s = store();
    await s.search('a', 'crochet');
    await s.ensure('a', 'crochet');
    expect(search).toHaveBeenCalledTimes(1);
    await s.ensure('a', 'knitting');
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('la fiche d’un patron : chargée, mesurée sans nom ni identifiant, gardée en mémoire', async () => {
    const s = store();
    await s.openPattern(7);
    expect(s.detail()).toEqual(FICHE);
    expect(s.detailStatus()).toBe('ok');
    expect(track).toHaveBeenCalledWith('pattern_viewed');
    expect(JSON.stringify(track.mock.calls)).not.toContain('7');

    await s.openPattern(7);
    expect(pattern).toHaveBeenCalledTimes(1);
  });

  it('la fiche : refus dit, puis réessai', async () => {
    const s = store();
    pattern.mockResolvedValueOnce({ ok: false, raison: 'introuvable' });
    await s.openPattern(7);
    expect(s.detailStatus()).toBe('error');
    expect(s.detailError()).toBe('introuvable');
    expect(s.detail()).toBeNull();
    await s.openPattern(7);
    expect(s.detailStatus()).toBe('ok');
  });
});

// --- Connexion Ravelry (fiche 62) -------------------------------------------------

describe('DiscoverStore avec la connexion Ravelry', () => {
  const REFUS_SESSION: RavelryResult<never> = { ok: false, raison: 'session-expiree' };
  let search: ReturnType<typeof vi.fn<RavelryClient['search']>>;
  let pattern: ReturnType<typeof vi.fn<RavelryClient['pattern']>>;
  let projects: ReturnType<typeof vi.fn<RavelryClient['projects']>>;
  let accessToken: ReturnType<typeof vi.fn<() => Promise<string | null>>>;
  let refreshAfterRejection: ReturnType<typeof vi.fn<(t: string) => Promise<string | null>>>;
  let expire: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let connected: ReturnType<typeof signal<boolean>>;

  function monter(mode: RavelryMode, jeton: string | null = 'at-1'): DiscoverStore {
    TestBed.resetTestingModule();
    search = vi.fn<RavelryClient['search']>(async () => page([1, 2], 1, 2));
    pattern = vi.fn<RavelryClient['pattern']>(async () => ({ ok: true, data: FICHE }));
    projects = vi.fn<RavelryClient['projects']>(async () => ({
      ok: true,
      data: { projets: [ouvrage(1), ouvrage(2)], page: 1, pages: 2 },
    }));
    accessToken = vi.fn(async () => jeton);
    refreshAfterRejection = vi.fn(async () => 'at-2');
    expire = vi.fn(async () => undefined);
    connected = signal(jeton !== null);
    TestBed.configureTestingModule({
      providers: [
        { provide: RAVELRY_URL_TOKEN, useValue: BASE },
        { provide: RAVELRY_MODE_TOKEN, useValue: mode },
        { provide: RAVELRY_CLIENT, useValue: { search, pattern, projects } },
        { provide: AnalyticsService, useValue: { track: vi.fn() } },
        {
          provide: RavelrySession,
          useValue: { accessToken, refreshAfterRejection, expire, connected },
        },
      ],
    });
    return TestBed.inject(DiscoverStore);
  }

  const ouvrage = (n: number) => ({
    photo: `https://images4-g.ravelrycache.com/p${n}.jpg`,
    lien: `https://www.ravelry.com/projects/u/o${n}`,
  });

  it('une lectrice connectée cherche et ouvre une fiche avec son jeton', async () => {
    const s = monter('compte');
    await s.search('sapin', 'crochet');
    expect(search).toHaveBeenCalledWith(BASE, { q: 'sapin', craft: 'crochet', page: 1 }, 'at-1');
    await s.openPattern(7);
    expect(pattern).toHaveBeenCalledWith(BASE, 7, 'at-1');
    await s.more();
    expect(search.mock.calls[1][2]).toBe('at-1');
  });

  it('en mode compte sans connexion : « connexion-requise », sans appeler le Worker', async () => {
    const s = monter('compte', null);
    await s.search('sapin', 'crochet');
    expect(s.status()).toBe('error');
    expect(s.error()).toBe('connexion-requise');
    await s.openPattern(7);
    expect(s.detailStatus()).toBe('error');
    expect(s.detailError()).toBe('connexion-requise');
    expect(search).not.toHaveBeenCalled();
    expect(pattern).not.toHaveBeenCalled();
  });

  it('en mode ouvert sans connexion : comme au lot 5, sans jeton', async () => {
    const s = monter('ouvert', null);
    await s.search('sapin', 'crochet');
    expect(search).toHaveBeenCalledWith(BASE, { q: 'sapin', craft: 'crochet', page: 1 }, null);
    expect(s.status()).toBe('ok');
  });

  describe('un 401 du Worker', () => {
    it('provoque un seul renouvellement puis rejoue la demande une fois avec le nouveau jeton', async () => {
      const s = monter('compte');
      search.mockResolvedValueOnce(REFUS_SESSION);
      await s.search('sapin', 'crochet');
      expect(refreshAfterRejection).toHaveBeenCalledTimes(1);
      expect(refreshAfterRejection).toHaveBeenCalledWith('at-1');
      expect(search).toHaveBeenCalledTimes(2);
      expect(search.mock.calls[1][2]).toBe('at-2');
      expect(s.status()).toBe('ok');
    });

    it('sans renouvellement possible : « session-expiree », sans rejouer', async () => {
      const s = monter('compte');
      search.mockResolvedValueOnce(REFUS_SESSION);
      refreshAfterRejection.mockResolvedValueOnce(null);
      await s.search('sapin', 'crochet');
      expect(search).toHaveBeenCalledTimes(1);
      expect(s.status()).toBe('error');
      expect(s.error()).toBe('session-expiree');
    });

    it('si le jeton neuf est refusé aussi : jamais de boucle, la connexion est perdue', async () => {
      const s = monter('compte');
      search.mockResolvedValue(REFUS_SESSION);
      await s.search('sapin', 'crochet');
      expect(search).toHaveBeenCalledTimes(2);
      expect(refreshAfterRejection).toHaveBeenCalledTimes(1);
      expect(expire).toHaveBeenCalledTimes(1);
      expect(s.error()).toBe('session-expiree');
    });

    it.each(['fiche', 'galerie'] as const)('vaut aussi pour la %s', async (quoi) => {
      const s = monter('compte');
      const appel = quoi === 'fiche' ? pattern : projects;
      appel.mockResolvedValueOnce(REFUS_SESSION);
      await (quoi === 'fiche' ? s.openPattern(7) : s.openProjects(7));
      expect(appel).toHaveBeenCalledTimes(2);
      expect(refreshAfterRejection).toHaveBeenCalledTimes(1);
    });
  });

  describe('galerie des ouvrages', () => {
    it('sans connexion (même en mode ouvert) : rien n’est demandé', async () => {
      const s = monter('ouvert', null);
      await s.openProjects(7);
      expect(projects).not.toHaveBeenCalled();
      expect(s.projectsStatus()).toBe('idle');
    });

    it('connectée : charge la première page avec le jeton, puis « Voir plus » ajoute sans doublon', async () => {
      const s = monter('ouvert');
      await s.openProjects(7);
      expect(projects).toHaveBeenCalledWith(BASE, 7, 1, 'at-1');
      expect(s.projectsStatus()).toBe('ok');
      expect(s.projects().map((p) => p.lien)).toEqual([ouvrage(1).lien, ouvrage(2).lien]);
      expect(s.hasMoreProjects()).toBe(true);
      projects.mockResolvedValueOnce({
        ok: true,
        data: { projets: [ouvrage(2), ouvrage(3)], page: 2, pages: 2 },
      });
      await s.moreProjects();
      expect(projects).toHaveBeenLastCalledWith(BASE, 7, 2, 'at-1');
      expect(s.projects()).toHaveLength(3);
      expect(s.hasMoreProjects()).toBe(false);
    });

    it('un patron sans ouvrage : état vide, pas une erreur', async () => {
      const s = monter('ouvert');
      projects.mockResolvedValueOnce({ ok: true, data: { projets: [], page: 1, pages: 1 } });
      await s.openProjects(7);
      expect(s.projectsStatus()).toBe('ok');
      expect(s.projects()).toEqual([]);
    });

    it('un refus est dit ; un autre patron repart d’une galerie vide', async () => {
      const s = monter('ouvert');
      projects.mockResolvedValueOnce({ ok: false, raison: 'quota-jour' });
      await s.openProjects(7);
      expect(s.projectsStatus()).toBe('error');
      expect(s.projectsError()).toBe('quota-jour');
      await s.openProjects(8);
      expect(projects).toHaveBeenLastCalledWith(BASE, 8, 1, 'at-1');
      expect(s.projectsStatus()).toBe('ok');
      expect(s.projects()).toHaveLength(2);
    });

    it('rouvrir le même patron ne redemande pas la galerie déjà là', async () => {
      const s = monter('ouvert');
      await s.openProjects(7);
      await s.openProjects(7);
      expect(projects).toHaveBeenCalledTimes(1);
    });
  });

  it('se déconnecter vide résultats, fiche et ouvrages : rien du compte ne reste en mémoire', async () => {
    const s = monter('ouvert');
    await s.search('sapin', 'crochet');
    await s.openPattern(7);
    await s.openProjects(7);
    expect(s.patrons()).not.toEqual([]);
    TestBed.tick();
    connected.set(false);
    TestBed.tick();
    expect(s.patrons()).toEqual([]);
    expect(s.status()).toBe('idle');
    expect(s.detail()).toBeNull();
    expect(s.projects()).toEqual([]);
    expect(s.projectsStatus()).toBe('idle');
  });

  it('une visite sans connexion (mode ouvert) garde ses résultats : rien à effacer', async () => {
    const s = monter('ouvert', null);
    await s.search('sapin', 'crochet');
    TestBed.tick();
    expect(s.patrons()).not.toEqual([]);
  });
});
