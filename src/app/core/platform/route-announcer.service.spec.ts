import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouteAnnouncer } from './route-announcer.service';

describe('RouteAnnouncer', () => {
  let main: HTMLElement;
  let outside: HTMLButtonElement;

  beforeEach(() => {
    main = document.createElement('main');
    main.id = 'main';
    main.tabIndex = -1;
    outside = document.createElement('button');
    document.body.append(outside, main);
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([
          { path: '', title: 'Accueil', children: [] },
          { path: 'glossaire', title: 'Glossaire', children: [] },
          { path: 'tailles', title: 'Tailles', children: [] },
        ]),
      ],
    });
  });

  afterEach(() => {
    main.remove();
    outside.remove();
  });

  async function go(url: string): Promise<void> {
    await TestBed.inject(Router).navigateByUrl(url);
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
  }

  it('au premier chargement, ne déplace pas le focus et n’annonce rien', async () => {
    const announcer = TestBed.inject(RouteAnnouncer);
    outside.focus();

    await go('/');

    expect(announcer.message()).toBe('');
    expect(document.activeElement).toBe(outside);
  });

  it('après une navigation, annonce le titre de la page et met le focus sur <main>', async () => {
    const announcer = TestBed.inject(RouteAnnouncer);
    await go('/');
    outside.focus();

    await go('/glossaire');

    expect(announcer.message()).toBe('Glossaire');
    expect(document.activeElement).toBe(main);
  });

  it('chaque navigation annonce la page où elle mène', async () => {
    const announcer = TestBed.inject(RouteAnnouncer);
    await go('/');
    await go('/glossaire');
    await go('/tailles');
    expect(announcer.message()).toBe('Tailles');
    await go('/glossaire');
    expect(announcer.message()).toBe('Glossaire');
  });

  it('un simple changement de fragment ne déplace pas le focus et n’annonce rien', async () => {
    const announcer = TestBed.inject(RouteAnnouncer);
    await go('/glossaire');
    await go('/tailles');
    await go('/tailles#haut');
    outside.focus();
    const before = announcer.message();

    await go('/tailles#bas');

    expect(announcer.message()).toBe(before);
    expect(document.activeElement).toBe(outside);
  });

  it('côté serveur, ne fait rien', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        provideRouter([
          { path: '', title: 'Accueil', children: [] },
          { path: 'glossaire', title: 'Glossaire', children: [] },
        ]),
      ],
    });
    const announcer = TestBed.inject(RouteAnnouncer);
    await go('/');
    await go('/glossaire');

    expect(announcer.message()).toBe('');
  });
});
