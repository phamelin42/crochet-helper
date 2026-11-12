import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ObjectUrlService } from '../../../core/platform/object-url.service';
import { ShareService } from '../../../core/platform/share.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { FINISHED_PHOTO_PREPARER, ReaderStore } from '../state/reader-store';
import { FinishView } from './finish-view';

const PATTERN = ['Petit sapin', 'Rang 1 : 6 ms', 'Rang 2 : 12 ms'].join('\n');
const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' });

describe('FinishView', () => {
  let track: ReturnType<typeof vi.fn>;
  let share: {
    hasNativeShare: ReturnType<typeof vi.fn>;
    share: ReturnType<typeof vi.fn>;
    copyText: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
  };
  let prepare: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
    installFakeIndexedDb();
    localStorage.clear();
    track = vi.fn();
    prepare = vi.fn().mockResolvedValue({ ok: true, photo: { blob: jpeg, width: 8, height: 6 } });
    share = {
      hasNativeShare: vi.fn().mockReturnValue(true),
      share: vi.fn().mockResolvedValue('shared'),
      copyText: vi.fn().mockResolvedValue(true),
      download: vi.fn().mockReturnValue(true),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
        { provide: ShareService, useValue: share },
        { provide: FINISHED_PHOTO_PREPARER, useValue: prepare },
        { provide: ObjectUrlService, useValue: { create: () => 'blob:photo', revoke: vi.fn() } },
      ],
    });
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  async function setup(locale: 'fr' | 'en' = 'fr') {
    TestBed.inject(I18nService).setLocale(locale);
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.load(PATTERN);
    for (let i = 0; i < store.total(); i++) store.advance();
    store.elapsed.set(125_000);
    const fixture = TestBed.createComponent(FinishView);
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const button = (name: string) =>
      [...host.querySelectorAll<HTMLElement>('button, a')].find(
        (el) => el.textContent?.trim() === name,
      );
    return { store, fixture, host, button };
  }

  it.each([
    ['fr', 'Bravo, votre ouvrage est terminé !', '2 étapes', 'Temps passé : 2:05'],
    ['en', 'Well done, your project is finished!', '2 steps', 'Time spent: 2:05'],
  ] as const)(
    'célèbre la fin en %s : titre, nom, étapes et temps',
    async (locale, title, steps, time) => {
      const { host } = await setup(locale);

      expect(host.querySelector('h2')?.textContent).toBe(title);
      expect(host.querySelector('.celebration-subtitle')?.textContent).toBe('Petit sapin');
      const facts = [...host.querySelectorAll('.celebration-facts li')].map((li) => li.textContent);
      expect(facts).toEqual([steps, time]);
    },
  );

  it('pose le focus sur le titre et annonce la fin (région status)', async () => {
    const { host } = await setup();

    expect(document.activeElement).toBe(host.querySelector('h2'));
    expect(host.querySelector('.celebration-head')?.getAttribute('role')).toBe('status');
  });

  it('propose les quatre actions, libellés visibles, et « Revoir la dernière étape »', async () => {
    const { button } = await setup();

    for (const name of [
      'Ajouter une photo de mon ouvrage',
      'Partager',
      'Recommencer ce patron',
      'Mes projets',
      'Revoir la dernière étape',
    ]) {
      expect(button(name), name).toBeTruthy();
    }
    expect(button('Mes projets')?.getAttribute('href')).toBe('/fr/mes-projets');
  });

  it('ajoute la photo choisie et le dit, sans rien envoyer ailleurs', async () => {
    const { host, store, fixture } = await setup();
    const input = host.querySelector<HTMLInputElement>('input[type=file]')!;
    expect(input.accept).toBe('image/*');
    Object.defineProperty(input, 'files', {
      value: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })],
      configurable: true,
    });

    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(store.finishedPhoto()).toBe(true));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.querySelector('[role=status]:not(.celebration-head)')?.textContent).toContain(
      'enregistrée sur cet appareil',
    );
    expect(host.querySelector('.finish-photo img')?.getAttribute('alt')).toBe(
      'Photo de votre ouvrage terminé : Petit sapin',
    );
    expect(track).toHaveBeenCalledWith('finished_photo_added');
  });

  it.each(['too-large', 'not-image'] as const)(
    'refus « %s » : message clair en alerte',
    async (reason) => {
      prepare.mockResolvedValue({ ok: false, reason });
      const { host, fixture } = await setup();
      const input = host.querySelector<HTMLInputElement>('input[type=file]')!;
      Object.defineProperty(input, 'files', {
        value: [new File(['x'], 'a.bin')],
        configurable: true,
      });

      input.dispatchEvent(new Event('change'));
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(host.querySelector('[role=alert]')?.textContent?.trim()).toBeTruthy();
      });
    },
  );

  it('« Partager » passe par le partage natif avec le message, et mesure le canal', async () => {
    const { button } = await setup();

    button('Partager')!.click();

    await vi.waitFor(() => expect(share.share).toHaveBeenCalled());
    expect(share.share.mock.calls[0][0].text).toBe(
      'J’ai terminé Petit sapin avec Pattern Reader !',
    );
    expect(track).toHaveBeenCalledWith('finished_shared', { canal: 'natif' });
  });

  it('annuler le partage n’affiche aucune erreur et ne mesure rien', async () => {
    share.share.mockResolvedValue('cancelled');
    const { button, host, fixture } = await setup();

    button('Partager')!.click();
    await vi.waitFor(() => expect(share.share).toHaveBeenCalled());
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.querySelector('[role=alert]')?.textContent?.trim()).toBe('');
    expect(track).not.toHaveBeenCalledWith('finished_shared', expect.anything());
  });

  it('sans Web Share : « Copier le message » prend la place, avec mesure du canal', async () => {
    share.hasNativeShare.mockReturnValue(false);
    const { button } = await setup();

    expect(button('Partager')).toBeUndefined();
    button('Copier le message')!.click();

    await vi.waitFor(() =>
      expect(track).toHaveBeenCalledWith('finished_shared', { canal: 'copie' }),
    );
    expect(share.copyText.mock.calls[0][0]).toContain('J’ai terminé Petit sapin');
    expect(share.copyText.mock.calls[0][0]).toContain('https://patternreader.com/fr');
  });

  it('« Recommencer » demande confirmation, puis remet la progression à zéro', async () => {
    const { button, store } = await setup();

    button('Recommencer ce patron')!.click();
    expect(store.finishedAt()).not.toBeNull();
    button('Recommencer')!.click();

    expect(store.done()).toEqual({});
    expect(store.finishedAt()).toBeNull();
  });

  it('« Revoir la dernière étape » écarte l’écran sans rien décocher', async () => {
    const { button, store } = await setup();

    button('Revoir la dernière étape')!.click();

    expect(store.endScreenVisible()).toBe(false);
    expect(store.isDone()).toBe(true);
  });
});
