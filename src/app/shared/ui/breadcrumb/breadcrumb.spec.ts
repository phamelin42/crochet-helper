import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { Breadcrumb } from './breadcrumb';

describe('Breadcrumb', () => {
  it('relie chaque niveau sauf le dernier, marqué page courante', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Breadcrumb);
    fixture.componentRef.setInput('label', 'Fil d’Ariane');
    fixture.componentRef.setInput('items', [
      { label: 'Accueil', href: '/fr' },
      { label: 'Glossaire', href: '/fr/glossaire' },
      { label: 'ms', href: '/fr/glossaire/ms' },
    ]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe('Fil d’Ariane');
    expect([...host.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/fr',
      '/fr/glossaire',
    ]);
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('ms');
  });
});
