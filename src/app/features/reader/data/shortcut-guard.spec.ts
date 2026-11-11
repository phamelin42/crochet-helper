import { afterEach, describe, expect, it } from 'vitest';
import { keyBelongsToTarget } from './shortcut-guard';

const OWNERS: Record<string, string> = {
  button: '<button type="button">Précédente</button>',
  a: '<a href="/glossaire">Glossaire</a>',
  summary: '<details><summary>Question</summary>Réponse</details>',
  input: '<input type="text" />',
  textarea: '<textarea></textarea>',
  select: '<select><option>a</option></select>',
  'role=button': '<div role="button" tabindex="0">Action</div>',
  contenteditable: '<div contenteditable="true">texte</div>',
  'enfant d’un bouton': '<button type="button"><span>Suivante</span></button>',
};

function mount(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  document.body.appendChild(holder);
  return holder;
}

describe('keyBelongsToTarget', () => {
  afterEach(() => (document.body.innerHTML = ''));

  for (const [name, html] of Object.entries(OWNERS)) {
    it(`laisse le geste natif à ${name}`, () => {
      const holder = mount(html);
      const target = (holder.querySelector('span') ??
        holder.firstElementChild?.querySelector('summary') ??
        holder.firstElementChild) as HTMLElement;
      expect(keyBelongsToTarget(target)).toBe(true);
    });
  }

  it('rend la main au corps de la page et au document', () => {
    expect(keyBelongsToTarget(document.body)).toBe(false);
    expect(keyBelongsToTarget(document)).toBe(false);
    expect(keyBelongsToTarget(null)).toBe(false);
    const holder = mount('<div class="reader"><p>texte</p></div>');
    expect(keyBelongsToTarget(holder.querySelector('p'))).toBe(false);
  });

  it('un contenteditable="false" ne garde pas le geste', () => {
    const holder = mount('<div contenteditable="false"><p>texte</p></div>');
    expect(keyBelongsToTarget(holder.querySelector('p'))).toBe(false);
  });

  it('rend le geste à la boîte de dialogue ouverte, quelle que soit la cible', () => {
    const holder = mount('<dialog open><p>Message</p></dialog><p id="derriere">patron</p>');
    expect(keyBelongsToTarget(holder.querySelector('#derriere'))).toBe(true);
    expect(keyBelongsToTarget(document.body)).toBe(true);
  });

  it('une boîte de dialogue fermée ne garde rien', () => {
    const holder = mount('<dialog><p>Message</p></dialog><p id="derriere">patron</p>');
    expect(keyBelongsToTarget(holder.querySelector('#derriere'))).toBe(false);
  });
});
