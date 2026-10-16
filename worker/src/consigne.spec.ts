import { describe, expect, it } from 'vitest';
import { FORMAT_PROMPT } from '../../src/app/features/format/format-prompt';
import { consigne, Langue } from './consigne';

const LANGUES: readonly Langue[] = ['fr', 'en'];
/** Ce que la consigne dit, par langue : la version gardée, le libellé d'étape, la mise en garde. */
const ATTENDU: Record<Langue, { version: string; etape: string; interdit: string }> = {
  fr: { version: 'version en français', etape: 'Étape N', interdit: 'Rangs 4-7' },
  en: { version: 'English version', etape: 'Step N', interdit: 'Rows 4-7' },
};

describe('consigne du Worker', () => {
  for (const langue of LANGUES) {
    describe(langue, () => {
      const texte = consigne(langue);

      it('reprend telle quelle la consigne de la page /format', () => {
        expect(texte.startsWith(FORMAT_PROMPT[langue])).toBe(true);
      });

      it('garde les marqueurs d’image', () => {
        expect(texte).toContain('[image N]');
      });

      it('ne garde que la version dans la langue de la lectrice quand le patron est répété', () => {
        expect(texte).toContain(ATTENDU[langue].version);
      });

      it('demande des étapes numérotées pour les paragraphes, au libellé que le découpeur reconnaît', () => {
        expect(texte).toContain(ATTENDU[langue].etape);
      });

      it('interdit d’ajouter un libellé de rang absent de l’original', () => {
        expect(texte).toContain(ATTENDU[langue].interdit);
      });
    });
  }
});
