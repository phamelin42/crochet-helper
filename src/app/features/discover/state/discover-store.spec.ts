import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { RAVELRY_URL_TOKEN } from '../../../core/ravelry/ravelry-access';
import { RAVELRY_CLIENT, RavelryClient } from '../../../core/ravelry/ravelry-client.token';
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
    expect(search).toHaveBeenCalledWith(BASE, { q: 'christmas tree', craft: 'crochet', page: 1 });
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
    expect(search).toHaveBeenLastCalledWith(BASE, { q: 'a', craft: 'crochet', page: 2 });
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
