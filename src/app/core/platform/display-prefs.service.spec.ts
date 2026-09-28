import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { DisplayPrefsService } from './display-prefs.service';

function setup(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  return TestBed.inject(DisplayPrefsService);
}

describe('DisplayPrefsService', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-text-size');
    document.documentElement.removeAttribute('data-dim');
  });

  it('démarre à la taille de base et au thème clair sans préférence enregistrée', async () => {
    const service = setup();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.textSize()).toBe('base');
    expect(service.dim()).toBe(false);
    expect(document.documentElement.hasAttribute('data-text-size')).toBe(false);
    expect(document.documentElement.hasAttribute('data-dim')).toBe(false);
  });

  it('relit la préférence enregistrée au démarrage', async () => {
    localStorage.setItem('fil.textSize', JSON.stringify('xl'));
    localStorage.setItem('fil.dim', JSON.stringify(true));

    const service = setup();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.textSize()).toBe('xl');
    expect(document.documentElement.getAttribute('data-text-size')).toBe('xl');
    expect(service.dim()).toBe(true);
    expect(document.documentElement.getAttribute('data-dim')).toBe('true');
  });

  it('ignore une valeur de taille inconnue en stockage et retombe sur la base', async () => {
    localStorage.setItem('fil.textSize', JSON.stringify('huge'));

    const service = setup();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.textSize()).toBe('base');
    expect(document.documentElement.hasAttribute('data-text-size')).toBe(false);
  });

  it('écrit la préférence choisie et pose l’attribut correspondant', () => {
    const service = setup();

    service.setTextSize('lg');
    service.setDim(true);

    expect(JSON.parse(localStorage.getItem('fil.textSize') ?? 'null')).toBe('lg');
    expect(document.documentElement.getAttribute('data-text-size')).toBe('lg');
    expect(JSON.parse(localStorage.getItem('fil.dim') ?? 'null')).toBe(true);
    expect(document.documentElement.getAttribute('data-dim')).toBe('true');
  });

  it('ne touche jamais au document côté serveur, sans casser', () => {
    const service = setup('server');

    expect(() => {
      service.setTextSize('xl');
      service.setDim(true);
    }).not.toThrow();
    expect(document.documentElement.hasAttribute('data-text-size')).toBe(false);
    expect(document.documentElement.hasAttribute('data-dim')).toBe(false);
  });
});
