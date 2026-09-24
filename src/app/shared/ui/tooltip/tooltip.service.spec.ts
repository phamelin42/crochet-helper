import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TooltipService } from './tooltip.service';

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y });
}

describe('TooltipService — survol réel ou page qui bouge', () => {
  let tooltips: TooltipService;

  beforeEach(() => {
    tooltips = TestBed.inject(TooltipService);
  });

  it("ignore un survol au point exact du dernier appui : c'est la page qui a bougé", () => {
    tooltips.notePress(pointer('pointerdown', 120, 340));
    expect(tooltips.isStationaryHover(pointer('pointerenter', 120, 340))).toBe(true);
  });

  it('garde un survol dès que le pointeur a bougé', () => {
    tooltips.notePress(pointer('pointerdown', 120, 340));
    expect(tooltips.isStationaryHover(pointer('pointerenter', 121, 340))).toBe(false);
  });

  it('garde un survol quand rien n’a encore été cliqué', () => {
    expect(tooltips.isStationaryHover(pointer('pointerenter', 120, 340))).toBe(false);
  });

  it('ne filtre jamais le focus clavier ni le toucher', () => {
    tooltips.notePress(pointer('pointerdown', 120, 340));
    expect(tooltips.isStationaryHover(new FocusEvent('focus'))).toBe(false);
    expect(tooltips.isStationaryHover(pointer('click', 120, 340))).toBe(false);
  });
});
