import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { PatternCard } from './pattern-card';

function monter(thumbnail: string | null) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(PatternCard);
  fixture.componentRef.setInput('name', 'Petit sapin');
  fixture.componentRef.setInput('designer', 'par Camille');
  fixture.componentRef.setInput('thumbnail', thumbnail);
  fixture.componentRef.setInput('link', '/find-a-pattern');
  fixture.componentRef.setInput('queryParams', { id: '101' });
  fixture.componentRef.setInput('tag', 'Free');
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('PatternCard', () => {
  it('montre la vignette avec dimensions fixes, chargement paresseux et nom en alt', () => {
    const { el } = monter('https://images4-g.ravelrycache.com/a.jpg');
    const img = el.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('Petit sapin');
    expect(img.getAttribute('width')).toBe('240');
    expect(img.getAttribute('height')).toBe('180');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(el.querySelector('.pattern-card-placeholder')).toBeNull();
  });

  it.each([[null], ['']])('sans vignette (%j), un espace réservé tient la place', (vignette) => {
    const { el } = monter(vignette);
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.pattern-card-placeholder')).not.toBeNull();
  });

  it('une vignette qui ne se charge pas (hors ligne) devient l’espace réservé', () => {
    const { fixture, el } = monter('https://images4-g.ravelrycache.com/a.jpg');
    el.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.pattern-card-placeholder')).not.toBeNull();
  });

  it('le nom est le lien vers la fiche, avec créatrice et pastille', () => {
    const { el } = monter(null);
    const lien = el.querySelector('h3 a')!;
    expect(lien.textContent).toBe('Petit sapin');
    expect(lien.getAttribute('href')).toBe('/find-a-pattern?id=101');
    expect(el.textContent).toContain('par Camille');
    expect(el.querySelector('.tag')?.textContent).toBe('Free');
  });
});
