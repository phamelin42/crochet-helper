import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { ReaderStore } from '../state/reader-store';
import ReaderPage from './reader-page';

const PATTERN = 'Rang 1 : 6 ms dans un cercle magique (6)\nRang 2 : 1 aug dans chaque m (12)';

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

  const NAVIGATION_KEYS = [
    ' ',
    'PageDown',
    'PageUp',
    'ArrowRight',
    'ArrowLeft',
    'ArrowUp',
    'ArrowDown',
  ];

  function press(target: EventTarget, key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  }

  const OWNERS: Record<string, string> = {
    button: '<button type="button">Précédente</button>',
    a: '<a href="/fr/glossaire">Glossaire</a>',
    summary: '<details><summary>Question</summary>Réponse</details>',
    select: '<select><option>a</option></select>',
    'role=button': '<div role="button" tabindex="0">Action</div>',
    contenteditable: '<div contenteditable="true">texte</div>',
  };

  for (const [name, html] of Object.entries(OWNERS)) {
    it(`patron chargé, aucune touche de navigation n’est volée à un élément ${name}`, () => {
      const { fixture, store } = setup();
      store.load(PATTERN);
      fixture.detectChanges();
      const holder = document.createElement('div');
      holder.innerHTML = html;
      document.body.appendChild(holder);
      try {
        const target = (holder.querySelector('summary') ?? holder.firstElementChild) as HTMLElement;
        for (const key of NAVIGATION_KEYS) {
          const event = press(target, key);
          expect(event.defaultPrevented, `${key} sur ${name}`).toBe(false);
        }
        expect(store.stepIndex()).toBe(0);
        expect(store.reps()).toEqual({});
      } finally {
        holder.remove();
      }
    });
  }

  it('patron chargé, une boîte de dialogue ouverte garde les touches', () => {
    const { fixture, store } = setup();
    store.load(PATTERN);
    fixture.detectChanges();
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    dialog.innerHTML = '<p>Message</p>';
    document.body.appendChild(dialog);
    try {
      for (const key of NAVIGATION_KEYS) {
        expect(press(dialog, key).defaultPrevented, key).toBe(false);
        expect(press(document.body, key).defaultPrevented, `${key} sur body`).toBe(false);
      }
      expect(store.stepIndex()).toBe(0);
    } finally {
      dialog.remove();
    }
  });

  it('sans patron chargé, aucune touche n’est interceptée : la page défile', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    for (const key of NAVIGATION_KEYS) {
      expect(press(document.body, key).defaultPrevented, key).toBe(false);
    }
  });

  it('patron chargé, Espace sur le corps de la page avance et empêche le défilement', () => {
    const { fixture, store } = setup();
    store.load(PATTERN);
    fixture.detectChanges();

    const event = press(document.body, ' ');

    expect(event.defaultPrevented).toBe(true);
    expect(store.stepIndex()).toBe(1);
  });

  function headingLevels(host: HTMLElement): number[] {
    return [...host.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));
  }

  it('patron chargé, la page a un seul <h1> : le titre du patron', () => {
    const { fixture, store, host } = setup();

    store.load(PATTERN);
    fixture.detectChanges();

    const h1s = host.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent?.trim()).toBe('Rang 1 : 6 ms dans un cercle magique (6)');
  });

  it('sans patron, la page a un seul <h1> : celui du bandeau d’accueil', () => {
    const { fixture, host } = setup();

    fixture.detectChanges();

    expect(host.querySelectorAll('h1').length).toBe(1);
    expect(host.querySelector('.home-hero h1')).toBeTruthy();
  });

  for (const loaded of [false, true]) {
    it(`${loaded ? 'patron chargé' : 'sans patron'}, les titres ne sautent aucun niveau`, () => {
      const { fixture, store, host } = setup();
      if (loaded) store.load(PATTERN);
      fixture.detectChanges();

      const levels = headingLevels(host);

      expect(levels[0]).toBe(1);
      levels.forEach((level, i) => {
        if (i > 0)
          expect(level, `titres ${levels.join(' ')}`).toBeLessThanOrEqual(levels[i - 1] + 1);
      });
    });
  }

  it('sans patron, le message d’invite est affiché et « Suivante » est désactivé', () => {
    const { fixture, host } = setup();

    fixture.detectChanges();

    expect(stepBody(host)).toContain('Collez ou écrivez votre patron');
    expect(findButton(host, 'Suivante').disabled).toBe(true);
  });

  it('sans patron, le bandeau d’accueil, « Comment ça marche », la FAQ et les guides sont affichés, pas les compteurs', () => {
    const { fixture, host } = setup();

    fixture.detectChanges();

    expect(host.querySelector('.home-hero')).toBeTruthy();
    expect(host.querySelector('.how-it-works')).toBeTruthy();
    expect(host.querySelector('.faq')).toBeTruthy();
    expect(host.querySelector('.grid-cards')).toBeTruthy();
    expect(host.querySelector('fil-reader-counters')).toBeNull();
    expect(host.querySelector('fil-waitlist-banner')).toBeNull();
  });

  it('patron chargé, le bandeau, « Comment ça marche », la FAQ et les guides disparaissent, et le panneau d’import passe après les compteurs', () => {
    const { fixture, store, host } = setup();

    store.load(PATTERN);
    fixture.detectChanges();

    expect(host.querySelector('.home-hero')).toBeNull();
    expect(host.querySelector('.how-it-works')).toBeNull();
    expect(host.querySelector('.faq')).toBeNull();
    expect(host.querySelector('.grid-cards')).toBeNull();

    const counters = host.querySelector('.meter');
    const importPanel = host.querySelector('.import-host');
    expect(counters).toBeTruthy();
    expect(importPanel).toBeTruthy();
    expect(
      counters!.compareDocumentPosition(importPanel!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(host.querySelector('fil-waitlist-banner')).not.toBeNull();
  });

  it('le dialogue de patron partagé n’est dans le DOM que si on l’ouvre', () => {
    const { fixture, host } = setup();

    fixture.detectChanges();

    expect(host.querySelector('fil-dialog')).toBeNull();
  });
});
