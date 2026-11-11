import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FocusService } from '../../../core/platform/focus.service';
import { Dialog } from './dialog';

describe('Dialog : le focus ne se perd pas à la fermeture', () => {
  const restoreIfLost = vi.fn();

  beforeEach(() => {
    restoreIfLost.mockReset();
    // jsdom ne connaît pas `showModal` : le comportement modal n'est pas l'objet du test.
    HTMLDialogElement.prototype.showModal ??= function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function () {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
    TestBed.configureTestingModule({
      providers: [{ provide: FocusService, useValue: { restoreIfLost } }],
    });
  });

  function open() {
    const fixture = TestBed.createComponent(Dialog);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  it('à la fermeture native (Échap, bouton), vérifie que le focus a un point d’appui', () => {
    const fixture = open();

    (fixture.nativeElement.querySelector('dialog') as HTMLDialogElement).dispatchEvent(
      new Event('close'),
    );

    expect(restoreIfLost).toHaveBeenCalled();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('quand le dialogue disparaît du document encore ouvert (choix qui le retire), aussi', () => {
    const fixture = open();
    restoreIfLost.mockClear();

    fixture.destroy();

    expect(restoreIfLost).toHaveBeenCalled();
  });
});
