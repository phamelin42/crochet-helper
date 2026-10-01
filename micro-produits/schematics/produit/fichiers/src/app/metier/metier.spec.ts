import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@mp/core';
import { Metier } from './metier';

describe('Metier', () => {
  it('signale le début d’utilisation de la fonction principale', async () => {
    const track = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: AnalyticsService, useValue: { track } }],
    });
    const fixture = TestBed.createComponent(Metier);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    expect(track).toHaveBeenCalledWith('outil_commence');
  });
});
