import { Component, computed, input } from '@angular/core';

/** Jeu d'icônes du produit — tracés Phosphor sur une grille 256, comme le design. */
export const ICONS = {
  moon: 'M233.5 142.4A8 8 0 0 0 224 136a88.1 88.1 0 0 1-104-104 8 8 0 0 0-10.4-9.5 104 104 0 1 0 133.4 133.4ZM128 216A88 88 0 0 1 96.6 45.6 104.1 104.1 0 0 0 210.4 159.4 88.2 88.2 0 0 1 128 216Z',
  eye: 'M247.3 124.8c-.3-.8-8.4-19.8-27.4-38.8C194.6 60.8 162.7 48 128 48S61.4 60.8 36.1 86A175.5 175.5 0 0 0 8.7 124.8a8.2 8.2 0 0 0 0 6.4c.3.8 8.4 19.8 27.4 38.8C61.4 195.2 93.3 208 128 208s66.6-12.8 91.9-38a175.5 175.5 0 0 0 27.4-38.8 8.2 8.2 0 0 0 0-6.4ZM128 192c-30.8 0-59.1-11.2-81.9-32.4A155.9 155.9 0 0 1 25.2 128a155.9 155.9 0 0 1 20.9-31.6C68.9 75.2 97.2 64 128 64s59.1 11.2 81.9 32.4a155.9 155.9 0 0 1 20.9 31.6c-4.9 8.9-27.6 64-102.8 64Zm0-112a48 48 0 1 0 48 48 48 48 0 0 0-48-48Zm0 80a32 32 0 1 1 32-32 32 32 0 0 1-32 32Z',
  chevron:
    'M213.7 101.7l-80 80a8 8 0 0 1-11.4 0l-80-80A8 8 0 0 1 53.7 90.3L128 164.7l74.3-74.4a8 8 0 0 1 11.4 11.4Z',
  left: 'M165.7 202.3a8 8 0 0 1-11.4 11.4l-80-80a8 8 0 0 1 0-11.4l80-80a8 8 0 0 1 11.4 11.4L91.3 128Z',
  right:
    'M181.7 133.7l-80 80a8 8 0 0 1-11.4-11.4L164.7 128 90.3 53.7a8 8 0 0 1 11.4-11.4l80 80a8 8 0 0 1 0 11.4Z',
  minus: 'M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8Z',
  plus: 'M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8Z',
  check:
    'M232.5 80.5l-128 128a8 8 0 0 1-11.4 0l-56-56a8 8 0 0 1 11.4-11.4L98.8 191.7 221.1 69.4a8 8 0 0 1 11.4 11.1Z',
  pause:
    'M200 32h-32a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h32a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16ZM88 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h32a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Z',
  play: 'M232 128a15.8 15.8 0 0 1-7.9 13.8l-112 66.3a16 16 0 0 1-16.1.1A15.8 15.8 0 0 1 88 194.3V61.7a15.8 15.8 0 0 1 8-13.9 16 16 0 0 1 16.1.1l112 66.3A15.8 15.8 0 0 1 232 128Z',
  image:
    'M208 32H48A16 16 0 0 0 32 48v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Zm0 176H48v-28.7l38.3-38.3a8 8 0 0 1 11.4 0l53 53Zm0-40.4-49-49a24 24 0 0 0-34 0l-27 27V48h110ZM152 84a12 12 0 1 1 12 12 12 12 0 0 1-12-12Z',
} as const;

export type IconName = keyof typeof ICONS;

/**
 * Icône SVG en ligne. Décorative par défaut (`aria-hidden`) : le sens est porté
 * par le libellé du bouton qui la contient, pas par l'icône.
 */
@Component({
  selector: 'fil-icon',
  template: `
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    svg {
      width: 1em;
      height: 1em;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly path = computed(() => ICONS[this.name()]);
}
