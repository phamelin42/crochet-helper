import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AI_FORMAT_CLIENT, AiRefusal } from '../../../core/ai/format-client.token';
import { AI_FORMAT_URL_TOKEN } from '../data/ai-format';
import { ReaderStore } from './reader-store';

const PATRON = ['Rang 1 : 6 ms (6)', 'Rang 2 : 6 aug (12)', 'Rang 3 : 12 ms (12)'].join('\n');
const REFUS: readonly AiRefusal[] = ['quota-jour', 'budget-mois', 'echec', 'trop-long'];

/**
 * Le refus de l'IA est un message : tant qu'il n'est pas lu, la page pleine
 * (qui masque le panneau d'import) ne doit pas le cacher. Le lire, c'est
 * passer à une autre étape.
 */
describe('ReaderStore : message de refus de la mise en forme par IA', () => {
  let store: ReaderStore;

  async function refuse(raison: AiRefusal): Promise<void> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AI_FORMAT_URL_TOKEN, useValue: 'https://worker.test/mise-en-forme' },
        { provide: AI_FORMAT_CLIENT, useValue: async () => ({ ok: false, raison }) },
      ],
    });
    store = TestBed.inject(ReaderStore);
    await store.loadText(PATRON, true);
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('le patron se charge quand même, et le message attend d’être lu (chaque raison)', async () => {
    for (const raison of REFUS) {
      await refuse(raison);
      expect(store.total()).toBe(3);
      expect(store.aiRefusal()).toBe(raison);
    }
  });

  it('passer à l’étape suivante ou précédente vaut lecture (chaque raison)', async () => {
    for (const raison of REFUS) {
      await refuse(raison);
      store.move(1);
      expect(store.aiRefusal()).toBeNull();

      await refuse(raison);
      store.move(-1);
      expect(store.aiRefusal()).toBeNull();
    }
  });

  it('sauter à une étape vaut lecture', async () => {
    await refuse('quota-jour');
    store.goTo(3, 'list');
    expect(store.aiRefusal()).toBeNull();
  });
});
