import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { Locale } from '../../core/i18n/locale';
import { GLOSSARY } from '../reader/data/glossary';
import GlossaryPage from './glossary-page';

function render(locale: Locale) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { locale } } } },
    ],
  });
  const fixture = TestBed.createComponent(GlossaryPage);
  fixture.detectChanges();
  return fixture;
}

const terms = (host: HTMLElement): string[] =>
  [...host.querySelectorAll('tbody th[scope="row"] code')].map((c) => c.textContent ?? '');

async function search(fixture: ReturnType<typeof render>, value: string): Promise<void> {
  const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="search"]')!;
  (input as HTMLInputElement).value = value;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

describe('GlossaryPage', () => {
  it('affiche toutes les entrées, triées, dès le rendu initial', () => {
    const list = terms(render('en').nativeElement);
    expect(list.length).toBe(GLOSSARY.length);
    expect(list).toContain('sc');
    expect(list).toContain('ms');
  });

  it('ouvre chaque groupe par une ligne de lettre, et les liens de lettres y mènent', () => {
    const host = render('fr').nativeElement as HTMLElement;
    const heads = [...host.querySelectorAll('th[scope="rowgroup"]')];
    expect(heads.length).toBeGreaterThan(5);
    expect(host.querySelectorAll('.glossary-letters a').length).toBe(heads.length);
    for (const head of heads) expect(head.id).toMatch(/^lettre-[a-z]$/);
  });

  it('donne à chaque terme une ancre à son slug, pour arriver droit sur sa ligne', () => {
    const host = render('fr').nativeElement as HTMLElement;
    for (const entry of GLOSSARY) {
      const row = host.querySelector(`tr[id="${entry.slug}"]`);
      expect(row?.querySelector('code')?.textContent, entry.slug).toBe(entry.term);
    }
    const ids = [...host.querySelectorAll('[id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('la recherche « ms » ne garde que les termes qui contiennent « ms »', async () => {
    const fixture = render('en');
    await search(fixture, 'ms');
    const host = fixture.nativeElement as HTMLElement;
    const rows = [...host.querySelectorAll('tbody tr:not(:has(th[scope="rowgroup"]))')];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect((row.textContent ?? '').toLowerCase()).toContain('ms');
  });

  it('affiche le message d’état vide, et le lien efface la recherche', async () => {
    const fixture = render('fr');
    await search(fixture, 'zzzzzz');
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('table')).toBeNull();
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      'Aucun terme ne correspond',
    );
    (host.querySelector('[role="status"] button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(terms(host).length).toBe(GLOSSARY.length);
  });
});
