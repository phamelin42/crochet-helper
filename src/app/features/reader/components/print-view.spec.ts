import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DEMO_PATTERN } from '../data/demo-pattern';
import { ReaderStore } from '../state/reader-store';
import { PrintView } from './print-view';

describe('PrintView', () => {
  it('rend toutes les pièces et toutes les étapes du patron, jamais une seule', () => {
    const fixture = TestBed.createComponent(PrintView);
    const store = TestBed.inject(ReaderStore);
    store.load(DEMO_PATTERN);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.print-piece').length).toBe(store.pieces().length);
    expect(host.querySelectorAll('.print-piece li').length).toBe(store.total());
    expect(host.querySelector('.print-materials')).not.toBeNull();
    expect(host.querySelector('.print-footer')?.textContent).toContain(String(store.total()));
  });

  it("n'affiche rien tant qu'aucun patron n'est chargé", () => {
    const fixture = TestBed.createComponent(PrintView);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });
});
