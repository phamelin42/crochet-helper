import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { TooltipHost } from './tooltip-host';
import { TooltipService } from './tooltip.service';

function escape(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  return event;
}

describe('TooltipHost', () => {
  const trigger = document.createElement('span');

  afterEach(() => trigger.remove());

  function setup() {
    document.body.appendChild(trigger);
    const fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
    return { fixture, tooltips: TestBed.inject(TooltipService) };
  }

  it('Échap ferme l’infobulle ouverte, sans autre effet (WCAG 1.4.13)', () => {
    const { fixture, tooltips } = setup();
    tooltips.showFor(trigger, 'sc', 'single crochet');
    fixture.detectChanges();
    expect(tooltips.state()).not.toBeNull();

    const event = escape();
    fixture.detectChanges();

    expect(tooltips.state()).toBeNull();
    expect(
      event.defaultPrevented,
      'le geste est consommé : la page pleine ne doit pas le recevoir',
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('.tip')?.classList.contains('on')).toBe(false);
  });

  it('sans infobulle ouverte, Échap passe : la page pleine ou le dialogue le reçoit', () => {
    const { tooltips } = setup();

    const event = escape();

    expect(tooltips.state()).toBeNull();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ne répète pas à voix haute un texte que le nom de l’élément porte déjà', () => {
    const { fixture, tooltips } = setup();
    trigger.setAttribute('aria-label', 'sc : single crochet');
    tooltips.showFor(trigger, 'sc', 'single crochet');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tip')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('annonce l’infobulle quand l’élément ne porte pas son texte', () => {
    const { fixture, tooltips } = setup();
    trigger.removeAttribute('aria-label');
    tooltips.showFor(trigger, 'Row 3 · Stitch 2', 'sc, single crochet');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tip')?.hasAttribute('aria-hidden')).toBe(false);
  });
});
