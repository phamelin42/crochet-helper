import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { FavoriteButton } from './favorite-button';

function monter(active: boolean) {
  const fixture = TestBed.createComponent(FavoriteButton);
  fixture.componentRef.setInput('active', active);
  fixture.componentRef.setInput('addLabel', 'Ajouter à mes favoris');
  fixture.componentRef.setInput('removeLabel', 'Retirer de mes favoris');
  fixture.componentRef.setInput('addedMessage', 'Ajouté.');
  fixture.componentRef.setInput('removedMessage', 'Retiré.');
  const basculer = vi.fn();
  fixture.componentInstance.toggled.subscribe(basculer);
  fixture.detectChanges();
  const el: HTMLElement = fixture.nativeElement;
  return { fixture, el, basculer, bouton: el.querySelector('button')! };
}

describe('FavoriteButton', () => {
  it('le libellé visible dit l’action, selon l’état', () => {
    expect(monter(false).bouton.textContent).toContain('Ajouter à mes favoris');
    expect(monter(true).bouton.textContent).toContain('Retirer de mes favoris');
  });

  it('le cœur est décoratif, jamais l’unique porteur du sens', () => {
    const { el } = monter(true);
    expect(el.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('annonce l’ajout puis le retrait, et prévient l’appelant du nouvel état', () => {
    const ajout = monter(false);
    ajout.bouton.click();
    ajout.fixture.detectChanges();
    expect(ajout.basculer).toHaveBeenCalledWith(true);
    expect(ajout.el.querySelector('[role="status"]')?.textContent).toBe('Ajouté.');

    const retrait = monter(true);
    retrait.bouton.click();
    retrait.fixture.detectChanges();
    expect(retrait.basculer).toHaveBeenCalledWith(false);
    expect(retrait.el.querySelector('[role="status"]')?.textContent).toBe('Retiré.');
  });

  it('ne dit rien avant la première action', () => {
    expect(monter(false).el.querySelector('[role="status"]')?.textContent).toBe('');
  });
});
