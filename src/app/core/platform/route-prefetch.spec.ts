import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app.routes';
import { LOCALES, localePrefix } from '../i18n/locale';
import { ROUTE_PATHS, RouteName } from '../i18n/route-paths';
import { RoutePrefetch, matchTarget, prefetchTargets } from './route-prefetch';

describe('matchTarget', () => {
  const targets = prefetchTargets(routes);
  const strip = (path: string) => path.replace(/^\//, '');

  it('trouve la route de chaque page, dans chaque langue', () => {
    for (const name of Object.keys(ROUTE_PATHS) as RouteName[]) {
      for (const locale of LOCALES) {
        const pathname = `${localePrefix(locale)}${ROUTE_PATHS[name][locale]}`;
        const route = matchTarget(targets, pathname);

        expect(route?.path, pathname).toBe(strip(ROUTE_PATHS[name][locale]));
        expect(route?.data?.['locale'], pathname).toBe(locale);
      }
    }
  });

  it("trouve la page d'une abréviation dans chaque langue", () => {
    for (const locale of LOCALES) {
      const glossary = ROUTE_PATHS.glossary[locale];
      const route = matchTarget(targets, `${localePrefix(locale)}${glossary}/ms`);
      expect(route?.path).toBe(`${strip(glossary)}/:slug`);
    }
  });

  it("ne devine rien pour une adresse qu'aucune route ne sert", () => {
    for (const pathname of ['/inconnu', '/fr/inconnu', '/glossary/ms/extra', '/favicon.svg']) {
      expect(matchTarget(targets, pathname), pathname).toBeNull();
    }
  });
});

@Component({ template: '' })
class Page {}

describe('RoutePrefetch', () => {
  afterEach(() => document.body.replaceChildren());

  function setup() {
    const load = vi.fn(() => Promise.resolve(Page));
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([{ path: 'page', loadComponent: load }]),
      ],
    });
    TestBed.inject(RoutePrefetch);
    return load;
  }

  function link(href: string): HTMLAnchorElement {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.append(document.createElement('span'));
    document.body.append(anchor);
    return anchor;
  }

  it('charge la route dès le survol, le focus ou le toucher du lien, une seule fois', () => {
    const load = setup();
    const anchor = link('/page');

    for (const type of ['pointerover', 'focusin', 'touchstart']) {
      anchor.firstElementChild!.dispatchEvent(new Event(type, { bubbles: true }));
    }

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('ignore les liens hors du site et les adresses sans route', () => {
    const load = setup();

    for (const href of ['https://example.com/page', '/autre']) {
      link(href).dispatchEvent(new Event('pointerover', { bubbles: true }));
    }

    expect(load).not.toHaveBeenCalled();
  });
});
