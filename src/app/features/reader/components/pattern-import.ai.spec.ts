import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { AI_FORMAT_CLIENT, AiFormatResult, AiRefusal } from '../../../core/ai/format-client.token';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { AI_FORMAT_URL_TOKEN, AI_INTEREST_URL_TOKEN } from '../data/ai-format';
import type { ExtractedPdf } from '../data/pdf-extract';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { Project } from '../data/project.model';
import { PDF_EXTRACTOR, ReaderStore } from '../state/reader-store';
import { PatternImport } from './pattern-import';

const ORIGINAL = 'Rang 1 : 6 ms dans un cercle magique (6) Rang 2 : 1 aug dans chaque m (12)';
const TIDY = 'Rang 1 : 6 ms dans un cercle magique (6)\nRang 2 : 1 aug dans chaque m (12)';
const PDF_LINES = ['Rang 1 : 6 ms dans un cercle magique (6)', 'Rang 2 : 1 aug dans chaque m (12)'];
const WORKER = 'https://worker.test/mise-en-forme';
const INTEREST = 'https://tally.so/r/test';

/**
 * Chaque cause de refus que la lectrice peut voir, avec la phrase attendue et le
 * code technique affiché (aucun pour les limites d'usage, dont le message dit tout).
 */
const CAUSES: readonly {
  raison: AiRefusal;
  detail?: string;
  message: ReaderTranslationKey;
  code: string | null;
}[] = [
  { raison: 'quota-jour', message: 'ui.aiDay', code: null },
  { raison: 'budget-mois', message: 'ui.aiMonth', code: null },
  { raison: 'trop-long', message: 'ui.aiTooLong', code: 'trop-long' },
  { raison: 'reseau', message: 'ui.aiNetwork', code: 'reseau' },
  {
    raison: 'reseau',
    detail: 'origine:crochet-helper.vercel.app',
    message: 'ui.aiNetwork',
    code: 'reseau · origine:crochet-helper.vercel.app',
  },
  { raison: 'delai', message: 'ui.aiSlow', code: 'delai' },
  {
    raison: 'echec',
    detail: 'trop-court:25%',
    message: 'ui.aiShort',
    code: 'echec · trop-court:25%',
  },
  {
    raison: 'echec',
    detail: 'nombres:21,22',
    message: 'ui.aiNumbers',
    code: 'echec · nombres:21,22',
  },
  {
    raison: 'echec',
    detail: 'arret:max_tokens',
    message: 'ui.aiIncomplete',
    code: 'echec · arret:max_tokens',
  },
  {
    raison: 'echec',
    detail: 'arret:refusal',
    message: 'ui.aiIncomplete',
    code: 'echec · arret:refusal',
  },
  { raison: 'echec', detail: 'vide', message: 'ui.aiIncomplete', code: 'echec · vide' },
  { raison: 'echec', message: 'ui.aiFailed', code: 'echec' },
  {
    raison: 'indisponible',
    detail: 'credits',
    message: 'ui.aiDown',
    code: 'indisponible · credits',
  },
  {
    raison: 'indisponible',
    detail: 'http-502',
    message: 'ui.aiDown',
    code: 'indisponible · http-502',
  },
  { raison: 'indisponible', message: 'ui.aiFailed', code: 'indisponible' },
];

describe('PatternImport — mise en forme par IA', () => {
  let client: ReturnType<typeof vi.fn<(...args: unknown[]) => Promise<AiFormatResult>>>;
  let track: ReturnType<typeof vi.fn>;

  function setup(workerUrl: string, interestUrl = INTEREST) {
    TestBed.resetTestingModule();
    track = vi.fn();
    const pdf: ExtractedPdf = {
      pages: [{ lines: PDF_LINES, images: [] }],
      truncated: false,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
        { provide: AI_FORMAT_URL_TOKEN, useValue: workerUrl },
        { provide: AI_INTEREST_URL_TOKEN, useValue: interestUrl },
        { provide: AI_FORMAT_CLIENT, useValue: client },
        { provide: PDF_EXTRACTOR, useValue: async () => pdf },
      ],
    });
    const fixture = TestBed.createComponent(PatternImport);
    fixture.detectChanges();
    return { fixture, store: TestBed.inject(ReaderStore) };
  }

  const t = (key: keyof (typeof READER_COPY)['fr']) =>
    READER_COPY[TestBed.inject(I18nService).locale()][key];
  const box = (f: ComponentFixture<PatternImport>) =>
    f.nativeElement.querySelector('input[type=checkbox]') as HTMLInputElement | null;
  const text = (f: ComponentFixture<PatternImport>) =>
    (f.nativeElement.textContent as string).trim();

  async function run(f: ComponentFixture<PatternImport>, checked: boolean) {
    const field = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    field.value = ORIGINAL;
    if (checked) {
      box(f)!.click();
      f.detectChanges();
    }
    (f.nativeElement.querySelector('.import-actions button') as HTMLButtonElement).click();
    await f.whenStable();
    f.detectChanges();
  }

  async function runPdf(f: ComponentFixture<PatternImport>, checked: boolean) {
    if (checked) {
      box(f)!.click();
      f.detectChanges();
    }
    const input = f.nativeElement.querySelector('input[accept="application/pdf,.pdf"]');
    Object.defineProperty(input, 'files', {
      value: [new File(['%PDF'], 'a.pdf', { type: 'application/pdf' })],
    });
    input.dispatchEvent(new Event('change'));
    await f.whenStable();
    await vi.waitFor(() => expect(TestBed.inject(ReaderStore).pdfImporting()).toBe(false));
    f.detectChanges();
  }

  beforeEach(() => {
    // jsdom ne connaît pas `showModal` : le comportement modal n'est pas l'objet du test.
    HTMLDialogElement.prototype.showModal ??= function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function () {
      this.removeAttribute('open');
    };
    installFakeIndexedDb();
    localStorage.clear();
    client = vi.fn(async () => ({ ok: true, texte: TIDY, restant: 2 }) as AiFormatResult);
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  it('n’affiche pas la case quand l’URL du Worker est vide, et n’appelle jamais le client', async () => {
    const { fixture, store } = setup('');
    expect(box(fixture)).toBeNull();
    await run(fixture, false);
    expect(client).not.toHaveBeenCalled();
    expect(store.total()).toBeGreaterThan(0);
  });

  it('propose la case décochée, y compris sur une nouvelle ouverture', () => {
    const first = setup(WORKER);
    expect(box(first.fixture)!.checked).toBe(false);
    box(first.fixture)!.click();
    first.fixture.detectChanges();
    expect(box(first.fixture)!.checked).toBe(true);

    const reopened = setup(WORKER);
    expect(box(reopened.fixture)!.checked).toBe(false);
  });

  it('n’envoie rien au Worker case décochée', async () => {
    const { fixture } = setup(WORKER);
    await run(fixture, false);
    await runPdf(fixture, false);
    expect(client).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalledWith('ai_format_requested', expect.anything());
  });

  it('texte collé, case cochée : le client est appelé une fois et le texte reçu est découpé', async () => {
    const { fixture, store } = setup(WORKER);
    await run(fixture, true);

    expect(client).toHaveBeenCalledTimes(1);
    expect(client.mock.calls[0].slice(0, 2)).toEqual([WORKER, ORIGINAL]);
    expect(store.source()).toBe(TIDY);
    expect(store.total()).toBe(2);
    expect(track).toHaveBeenCalledWith('ai_format_requested', { origine: 'saisie' });
    expect(track).toHaveBeenCalledWith('ai_format_succeeded');
    expect(text(fixture)).toContain(t('ui.aiDone').replace('{n}', '2'));
    // Jamais le texte du patron dans la mesure.
    expect(JSON.stringify(track.mock.calls)).not.toContain('cercle magique');
  });

  it('PDF, case cochée : même chemin, le client est appelé une fois', async () => {
    const { fixture, store } = setup(WORKER);
    await runPdf(fixture, true);

    expect(client).toHaveBeenCalledTimes(1);
    expect(store.source()).toBe(TIDY);
    expect(store.sourceBeforeAi()).toContain('Rang 1 : 6 ms dans un cercle magique');
    expect(track).toHaveBeenCalledWith('ai_format_requested', { origine: 'pdf' });
  });

  it('garde le texte d’origine avec le projet, relu après écriture, et permet d’y revenir', async () => {
    const { fixture, store } = setup(WORKER);
    const db = TestBed.inject(ProjectStoreService);
    await store.initialize();
    await run(fixture, true);

    await vi.waitFor(async () => {
      const [saved] = await db.list<Project>();
      expect(saved?.sourceBeforeAi).toBe(ORIGINAL);
      expect(saved?.source).toBe(TIDY);
    });

    const revert = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: HTMLButtonElement) => b.textContent!.trim() === t('ui.aiRevert'),
    ) as HTMLButtonElement;
    revert.click();
    fixture.detectChanges();
    // Rien ne change avant la confirmation.
    expect(store.source()).toBe(TIDY);

    const confirm = [...document.querySelectorAll('.dialog-actions button')].find(
      (b) => b.textContent!.trim() === t('ui.aiRevert'),
    ) as HTMLButtonElement;
    confirm.click();
    fixture.detectChanges();

    expect(store.source()).toBe(ORIGINAL);
    expect(store.sourceBeforeAi()).toBeNull();
    await vi.waitFor(async () => {
      const [saved] = await db.list<Project>();
      expect(saved?.source).toBe(ORIGINAL);
      expect(saved?.sourceBeforeAi).toBeUndefined();
    });
  });

  describe.each(CAUSES)(
    'refus « $raison » $detail',
    ({ raison, detail, message: attendu, code }) => {
      const monetary = raison === 'quota-jour' || raison === 'budget-mois';

      beforeEach(() => {
        client.mockResolvedValue({ ok: false, raison, ...(detail ? { detail } : {}) });
      });

      it('charge quand même le patron par l’outil habituel, et dit la vraie cause', async () => {
        const { fixture, store } = setup(WORKER);
        await run(fixture, true);

        expect(store.source()).toBe(ORIGINAL);
        expect(store.sourceBeforeAi()).toBeNull();
        expect(store.total()).toBeGreaterThan(0);
        expect(track).toHaveBeenCalledWith('ai_format_refused', { raison });
        const message = text(fixture);
        expect(message).toContain(t(attendu));
        expect(message.includes(t('ui.aiSorry'))).toBe(monetary);
        expect(message.includes(t('ui.aiAskLink'))).toBe(monetary);
      });

      it('donne le code technique, sauf pour les limites d’usage', async () => {
        const { fixture } = setup(WORKER);
        await run(fixture, true);
        const message = text(fixture);
        if (code === null) expect(message).not.toContain(t('ui.aiCode'));
        else expect(message).toContain(`${t('ui.aiCode')} ${code}`);
      });

      it('garde le message visible : le panneau reste ouvert', async () => {
        const { fixture } = setup(WORKER);
        await run(fixture, true);
        expect(fixture.nativeElement.querySelector('[aria-live=polite]').textContent).toContain(
          t(attendu),
        );
        expect(fixture.nativeElement.querySelector('textarea')).not.toBeNull();
      });
    },
  );

  it('les phrases de refus se distinguent : aucune cause précise ne reprend le message général', () => {
    const precises = CAUSES.filter((c) => c.message !== 'ui.aiFailed').map((c) => t(c.message));
    expect(precises).not.toContain(t('ui.aiFailed'));
    expect(new Set(CAUSES.map((c) => c.message)).size).toBeGreaterThanOrEqual(10);
  });

  it.each(['quota-jour', 'budget-mois'] as const)(
    '« %s » sans URL du formulaire : la phrase d’invitation disparaît, pas l’excuse',
    async (raison) => {
      client.mockResolvedValue({ ok: false, raison });
      const { fixture } = setup(WORKER, '');
      await run(fixture, true);
      const message = text(fixture);
      expect(message).toContain(t('ui.aiSorry'));
      expect(message).not.toContain(t('ui.aiAsk'));
      expect(fixture.nativeElement.querySelector(`a[href="${INTEREST}"]`)).toBeNull();
    },
  );

  it('le lien du formulaire s’ouvre dans un autre onglet', async () => {
    client.mockResolvedValue({ ok: false, raison: 'quota-jour' });
    const { fixture } = setup(WORKER);
    await run(fixture, true);
    const link = fixture.nativeElement.querySelector(`a[href="${INTEREST}"]`) as HTMLAnchorElement;
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('désactive les boutons et annonce l’attente pendant l’appel', async () => {
    let finish!: (r: AiFormatResult) => void;
    client.mockReturnValue(new Promise<AiFormatResult>((resolve) => (finish = resolve)));
    const { fixture } = setup(WORKER);
    const field = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    field.value = ORIGINAL;
    box(fixture)!.click();
    fixture.detectChanges();
    const load = fixture.nativeElement.querySelector('.import-actions button') as HTMLButtonElement;
    load.click();
    fixture.detectChanges();

    expect(load.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[aria-live=polite]').textContent).toContain(
      t('ui.aiBusy'),
    );
    finish({ ok: true, texte: TIDY, restant: 1 });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(load.disabled).toBe(false);
  });
});
