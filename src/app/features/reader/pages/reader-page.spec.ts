import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { ReaderStore } from '../state/reader-store';
import { ReaderPage } from './reader-page';

const PATTERN =
  'Rang 1 : 6 ms dans un cercle magique (6)\nRang 2 : 1 aug dans chaque m (12)';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { locale: 'fr' } } } },
    ],
  });
  const fixture = TestBed.createComponent(ReaderPage);
  const store = TestBed.inject(ReaderStore);
  return { fixture, store, host: fixture.nativeElement as HTMLElement };
}

function findButton(host: HTMLElement, label: string): HTMLButtonElement {
  const button = [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  if (!button) throw new Error(`Bouton « ${label} » introuvable`);
  return button;
}

/** Le texte de l'étape en cours, tel qu'affiché en grand — distinct du rendu
 *  complet, toujours présent dans le DOM pour l'impression. */
function stepBody(host: HTMLElement): string {
  return host.querySelector('.step-body')?.textContent ?? '';
}

describe('ReaderPage', () => {
  it('affiche le texte de l’étape courante quand un patron est chargé', () => {
    const { fixture, store, host } = setup();

    store.load(PATTERN);
    fixture.detectChanges();

    expect(stepBody(host)).toContain('6 ms dans un cercle magique');
  });

  it('un clic sur « Suivante » affiche l’étape suivante', () => {
    const { fixture, store, host } = setup();
    store.load(PATTERN);
    fixture.detectChanges();

    findButton(host, 'Suivante').click();
    fixture.detectChanges();

    expect(stepBody(host)).toContain('1 aug dans chaque m');
    expect(stepBody(host)).not.toContain('6 ms dans un cercle magique');
  });

  it('ArrowRight sur le document avance d’une étape', () => {
    const { fixture, store, host } = setup();
    store.load(PATTERN);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(store.stepIndex()).toBe(1);
    expect(stepBody(host)).toContain('1 aug dans chaque m');
  });

  it('ArrowRight émis depuis un <textarea> n’avance pas', () => {
    const { fixture, store } = setup();
    store.load(PATTERN);
    fixture.detectChanges();

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    try {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      fixture.detectChanges();

      expect(store.stepIndex()).toBe(0);
    } finally {
      textarea.remove();
    }
  });

  it('sans patron, le message d’invite est affiché et « Suivante » est désactivé', () => {
    const { fixture, host } = setup();

    fixture.detectChanges();

    expect(stepBody(host)).toContain('Collez ou écrivez votre pattern');
    expect(findButton(host, 'Suivante').disabled).toBe(true);
  });
});
