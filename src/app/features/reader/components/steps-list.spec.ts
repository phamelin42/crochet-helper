import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_PATTERN } from '../data/demo-pattern';
import { ReaderStore } from '../state/reader-store';
import { StepsList } from './steps-list';

describe('StepsList', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  function setup() {
    const fixture = TestBed.createComponent(StepsList);
    const store = TestBed.inject(ReaderStore);
    store.load(DEMO_PATTERN);
    fixture.detectChanges();
    return { fixture, store };
  }

  function items(fixture: ReturnType<typeof setup>['fixture']): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.steps-item'));
  }

  it("a autant d'entrées que d'étapes dans la pièce courante, l'étape en cours marquée", () => {
    const { fixture, store } = setup();

    const rows = items(fixture);
    expect(rows).toHaveLength(store.stepCount());
    expect(rows.filter((row) => row.getAttribute('aria-current') === 'step')).toHaveLength(1);
    expect(rows[0].getAttribute('aria-current')).toBe('step');
  });

  it('un clic sur une entrée saute à l’étape correspondante', () => {
    const { fixture, store } = setup();

    items(fixture)[2].click();
    fixture.detectChanges();

    expect(store.stepIndex()).toBe(2);
    expect(items(fixture)[2].getAttribute('aria-current')).toBe('step');
  });

  it('le champ « Aller à l’étape n° » ramène 0 et 999 dans les bornes du patron', () => {
    const { fixture, store } = setup();
    const host = fixture.nativeElement as HTMLElement;
    const field = host.querySelector<HTMLInputElement>('#steps-goto-field')!;
    const goButton = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Go',
    ) as HTMLButtonElement;

    field.value = '0';
    goButton.click();
    fixture.detectChanges();
    expect(store.stepIndex()).toBe(0);

    field.value = '999';
    goButton.click();
    fixture.detectChanges();
    expect(store.stepIndex()).toBe(store.stepCount() - 1);
  });
});
