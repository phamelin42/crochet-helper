import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { RowCounterPage } from './row-counter-page';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { locale: 'fr' } } } },
    ],
  });
  const fixture = TestBed.createComponent(RowCounterPage);
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

function findButton(host: HTMLElement, label: string): HTMLButtonElement {
  const button = [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  if (!button) throw new Error(`Bouton « ${label} » introuvable`);
  return button;
}

describe('RowCounterPage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('affiche la valeur relue en localStorage au démarrage', async () => {
    localStorage.setItem('fil.rowCounter', JSON.stringify({ count: 7, target: null }));

    const { fixture, host } = setup();
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    expect(host.querySelector('.counter-count')?.textContent).toContain('7');
  });

  it('« −1 » est désactivé à 0', async () => {
    const { fixture, host } = setup();
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    expect(host.querySelector('.counter-count')?.textContent).toContain('0');
    expect(findButton(host, '−1').disabled).toBe(true);
  });

  it('« +1 » puis « −1 » réactive et incrémente correctement', async () => {
    const { fixture, host } = setup();
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    findButton(host, '+1').click();
    fixture.detectChanges();

    expect(host.querySelector('.counter-count')?.textContent).toContain('1');
    expect(findButton(host, '−1').disabled).toBe(false);
  });
});
