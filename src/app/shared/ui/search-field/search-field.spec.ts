import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { SearchField } from './search-field';

function monter() {
  const fixture = TestBed.createComponent(SearchField);
  fixture.componentRef.setInput('label', 'Que cherchez-vous ?');
  fixture.componentRef.setInput('buttonLabel', 'Rechercher');
  const recherche = vi.fn();
  fixture.componentInstance.submitted.subscribe(recherche);
  fixture.detectChanges();
  const el: HTMLElement = fixture.nativeElement;
  return { fixture, el, recherche, input: el.querySelector('input')! };
}

describe('SearchField', () => {
  it('relie le libellé visible au champ, dans un formulaire de recherche', () => {
    const { el, input } = monter();
    const label = el.querySelector('label')!;
    expect(label.textContent).toContain('Que cherchez-vous ?');
    expect(label.htmlFor).toBe(input.id);
    expect(el.querySelector('form')?.getAttribute('role')).toBe('search');
    expect(input.getAttribute('maxlength')).toBe('100');
  });

  it('ne lance rien à la frappe, seulement au bouton ou à Entrée, texte nettoyé', () => {
    const { fixture, el, recherche, input } = monter();
    input.value = '  christmas tree  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(recherche).not.toHaveBeenCalled();

    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(recherche).toHaveBeenCalledWith('christmas tree');
  });

  it('empêche l’envoi natif du formulaire', () => {
    const { el } = monter();
    const envoi = new Event('submit', { cancelable: true });
    el.querySelector('form')!.dispatchEvent(envoi);
    expect(envoi.defaultPrevented).toBe(true);
  });

  it('grise le bouton pendant une recherche', () => {
    const { fixture, el } = monter();
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    expect(el.querySelector('button')!.disabled).toBe(true);
  });
});
