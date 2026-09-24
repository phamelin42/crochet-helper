import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LOCALES } from '../i18n/locale';
import { SeoService } from './seo.service';

const PATH = { fr: '/glossaire', en: '/glossary' };

function meta(doc: Document, key: string): string | null {
  return (
    (
      doc.head.querySelector(`meta[property="${key}"]`) ??
      doc.head.querySelector(`meta[name="${key}"]`)
    )?.getAttribute('content') ?? null
  );
}

function jsonLd(doc: Document): Record<string, unknown> {
  const script = doc.head.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.textContent ?? '{}') as Record<string, unknown>;
}

describe('SeoService — image de partage', () => {
  let seo: SeoService;
  let doc: Document;

  beforeEach(() => {
    seo = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
  });

  for (const locale of LOCALES) {
    it(`donne à chaque page une image absolue, dans sa langue (${locale})`, () => {
      seo.apply({ title: 'T', description: 'D', path: PATH, locale });

      const url = `https://patternreader.com/og/pattern-reader-${locale}.png`;
      expect(meta(doc, 'og:image')).toBe(url);
      expect(meta(doc, 'twitter:image')).toBe(url);
      expect(meta(doc, 'og:image:width')).toBe('1200');
      expect(meta(doc, 'og:image:height')).toBe('630');
      expect(meta(doc, 'og:image:alt')).toBeTruthy();
    });
  }

  it("ajoute l'image aux données structurées qui n'en ont pas", () => {
    seo.apply({
      title: 'T',
      description: 'D',
      path: PATH,
      locale: 'fr',
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebApplication' },
    });
    expect(jsonLd(doc)['image']).toBe('https://patternreader.com/og/pattern-reader-fr.png');
  });

  it("respecte l'image déjà fournie et ne touche pas à un @graph", () => {
    seo.apply({
      title: 'T',
      description: 'D',
      path: PATH,
      locale: 'en',
      jsonLd: { '@type': 'Article', image: 'https://example.com/a.png' },
    });
    expect(jsonLd(doc)['image']).toBe('https://example.com/a.png');

    seo.apply({
      title: 'T',
      description: 'D',
      path: PATH,
      locale: 'en',
      jsonLd: { '@context': 'https://schema.org', '@graph': [] },
    });
    expect(jsonLd(doc)['image']).toBeUndefined();
  });
});
