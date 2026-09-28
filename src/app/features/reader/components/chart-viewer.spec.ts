import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ChartViewer, MAX_ZOOM, MIN_ZOOM } from './chart-viewer';

describe('ChartViewer', () => {
  function setup() {
    const fixture = TestBed.createComponent(ChartViewer);
    fixture.componentRef.setInput('chart', { url: 'blob:test', width: 1200, height: 800 });
    fixture.componentRef.setInput('label', 'Chart 1');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const button = (name: string) =>
      Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === name) as
        HTMLButtonElement | undefined;
    const stage = () => host.querySelector<HTMLElement>('.chart-stage')!;
    const image = () => host.querySelector<HTMLElement>('.chart-img')!;
    return { fixture, component: fixture.componentInstance, button, stage, image };
  }

  it('borne le zoom entre 0,5 et 4, sans jamais dépasser', () => {
    const { fixture, component, button } = setup();

    for (let i = 0; i < 30; i++) button('Zoom +')!.click();
    fixture.detectChanges();
    expect(component.zoom()).toBe(MAX_ZOOM);
    expect(button('Zoom +')!.disabled).toBe(true);

    for (let i = 0; i < 30; i++) button('Zoom −')!.click();
    fixture.detectChanges();
    expect(component.zoom()).toBe(MIN_ZOOM);
    expect(button('Zoom −')!.disabled).toBe(true);
  });

  it('applique le zoom en scale() et revient à la largeur du cadre avec « Fit »', () => {
    const { fixture, component, button, stage } = setup();

    button('Zoom +')!.click();
    fixture.detectChanges();
    expect(stage().style.transform).toBe('scale(1.25)');

    button('Fit')!.click();
    fixture.detectChanges();
    expect(component.zoom()).toBe(1);
    expect(stage().style.transform).toBe('scale(1)');
  });

  it('tourne par quarts de tour et revient au départ au quatrième', () => {
    const { fixture, component, button, stage, image } = setup();
    const seen: number[] = [];

    for (let i = 0; i < 4; i++) {
      button('Rotate')!.click();
      fixture.detectChanges();
      seen.push(component.turns());
    }

    expect(seen).toEqual([1, 2, 3, 0]);
    expect(image().classList.contains('turn-0')).toBe(true);
    // Un quart de tour échange largeur et hauteur : la scène change de rapport.
    expect(stage().style.aspectRatio.replace(/\s/g, '')).toBe('1200/800');
    button('Rotate')!.click();
    fixture.detectChanges();
    expect(stage().style.aspectRatio.replace(/\s/g, '')).toBe('800/1200');
    expect(image().classList.contains('turn-1')).toBe(true);
  });

  it('propose le plein écran seulement quand on le lui demande', () => {
    const { fixture, button } = setup();
    expect(button('Full screen')).toBeUndefined();

    fixture.componentRef.setInput('canFullscreen', true);
    fixture.detectChanges();
    expect(button('Full screen')).toBeDefined();
  });

  it('rend la région défilable focalisable et nommée', () => {
    const { fixture } = setup();

    const frame = (fixture.nativeElement as HTMLElement).querySelector('.chart-frame')!;
    expect(frame.getAttribute('tabindex')).toBe('0');
    expect(frame.getAttribute('aria-label')).toBe('Chart 1');
  });
});
