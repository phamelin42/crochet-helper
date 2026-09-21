import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GlossaryText } from './glossary-text';

describe('GlossaryText', () => {
  it('rend le texte à l’identique, sans espace ajoutée autour des abréviations', () => {
    const fixture = TestBed.createComponent(GlossaryText);
    const text = 'Rnd 3: *sc in next st, inc in next st; rep from * around (18)';
    fixture.componentRef.setInput('text', text);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toBe(text);
    expect([...host.querySelectorAll('.abbr')].map((el) => el.textContent)).toEqual([
      'Rnd',
      'sc',
      'st',
      'inc',
      'st',
      'rep',
    ]);
  });
});
