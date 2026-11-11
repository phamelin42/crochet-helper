import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FocusService } from './focus.service';

describe('FocusService', () => {
  let holder: HTMLElement;

  beforeEach(() => {
    holder = document.createElement('div');
    holder.innerHTML =
      '<button id="ailleurs">Ailleurs</button><main id="main" tabindex="-1"><p class="step-body" tabindex="-1">Étape</p></main>';
    document.body.appendChild(holder);
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
  });

  afterEach(() => holder.remove());

  async function flush(): Promise<void> {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
  }

  it('si le focus est tombé sur le corps de la page, le rend à l’étape en cours', async () => {
    (document.activeElement as HTMLElement | null)?.blur();
    TestBed.inject(FocusService).restoreIfLost();
    await flush();

    expect(document.activeElement).toBe(holder.querySelector('.step-body'));
  });

  it('sans étape à l’écran, le rend à <main>', async () => {
    holder.querySelector('.step-body')?.remove();
    TestBed.inject(FocusService).restoreIfLost();
    await flush();

    expect(document.activeElement).toBe(holder.querySelector('main'));
  });

  it('quand l’ouvrant a disparu du document, le focus n’est pas laissé au corps de la page', async () => {
    const opener = document.createElement('button');
    holder.appendChild(opener);
    opener.focus();
    opener.remove();
    TestBed.inject(FocusService).restoreIfLost();
    await flush();

    expect(document.activeElement).toBe(holder.querySelector('.step-body'));
  });

  it('un focus déjà posé sur un contrôle visible n’est pas déplacé', async () => {
    const other = holder.querySelector<HTMLButtonElement>('#ailleurs')!;
    other.focus();
    TestBed.inject(FocusService).restoreIfLost();
    await flush();

    expect(document.activeElement).toBe(other);
  });
});
