import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StylesheetService } from './stylesheet.service';

function links(href: string): HTMLLinkElement[] {
  const doc = TestBed.inject(DOCUMENT);
  return Array.from(doc.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).filter(
    (link) => link.getAttribute('href') === href,
  );
}

describe('StylesheetService', () => {
  afterEach(() => links('pages.css').forEach((link) => link.remove()));

  it('côté serveur, lie la feuille dans le <head> une seule fois, pour le HTML pré-rendu', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const styles = TestBed.inject(StylesheetService);

    await styles.load('pages.css');
    await styles.load('pages.css');

    expect(links('pages.css')).toHaveLength(1);
  });

  it('dans le navigateur, une feuille déjà liée par le HTML reçu est tenue pour appliquée', async () => {
    const doc = TestBed.inject(DOCUMENT);
    const prerendered = doc.createElement('link');
    prerendered.rel = 'stylesheet';
    prerendered.setAttribute('href', 'pages.css');
    doc.head.appendChild(prerendered);

    await TestBed.inject(StylesheetService).load('pages.css');

    expect(links('pages.css')).toEqual([prerendered]);
  });

  it('dans le navigateur, attend le chargement de la feuille, et se résout aussi en échec', async () => {
    const styles = TestBed.inject(StylesheetService);
    let done = false;
    const pending = styles.load('pages.css').then(() => (done = true));

    const [link] = links('pages.css');
    await Promise.resolve();
    expect(done).toBe(false);
    link.dispatchEvent(new Event('error'));
    await pending;
    expect(done).toBe(true);
  });
});
