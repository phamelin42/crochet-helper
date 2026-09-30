import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, afterNextRender, inject, signal } from '@angular/core';
import { LocalStorageService } from '../storage/local-storage.service';

export type ReaderTextSize = 'base' | 'lg' | 'xl';

const TEXT_SIZES: readonly ReaderTextSize[] = ['base', 'lg', 'xl'];
const TEXT_SIZE_KEY = 'fil.textSize';
const DIM_KEY = 'fil.dim';
const FOCUS_KEY = 'fil.focus';

/**
 * Les réglages de lecture (taille du texte, fond sombre, mode page pleine),
 * posés en attribut sur `<html>` et persistés. Seule implémentation : le lecteur et la
 * vitrine du design system la partagent (fiche 24).
 */
@Service()
export class DisplayPrefsService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage = inject(LocalStorageService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly textSize = signal<ReaderTextSize>('base');
  readonly dim = signal(false);
  /** Mode page pleine (fiche 38) : activé tant que la lectrice ne l'a pas quitté. */
  readonly focus = signal(true);

  constructor() {
    // Après le premier rendu plutôt qu'au constructeur : la préférence vient
    // de `localStorage`, absent au pré-rendu. Un bref flash clair est accepté.
    afterNextRender(() => {
      const size = this.storage.read<ReaderTextSize>(TEXT_SIZE_KEY);
      if (size && TEXT_SIZES.includes(size)) this.setTextSize(size);
      if (this.storage.read<boolean>(DIM_KEY)) this.setDim(true);
      if (this.storage.read<boolean>(FOCUS_KEY) === false) this.focus.set(false);
    });
  }

  setTextSize(value: ReaderTextSize): void {
    this.textSize.set(value);
    this.storage.write(TEXT_SIZE_KEY, value);
    if (!this.isBrowser) return;
    if (value === 'base') this.doc.documentElement.removeAttribute('data-text-size');
    else this.doc.documentElement.setAttribute('data-text-size', value);
  }

  setDim(value: boolean): void {
    this.dim.set(value);
    this.storage.write(DIM_KEY, value);
    if (!this.isBrowser) return;
    if (value) this.doc.documentElement.setAttribute('data-dim', 'true');
    else this.doc.documentElement.removeAttribute('data-dim');
  }

  setFocus(value: boolean): void {
    this.focus.set(value);
    this.storage.write(FOCUS_KEY, value);
  }

  /**
   * Pose `data-focus` sur `<html>`. Le lecteur l'appelle seulement quand un
   * patron est chargé : la page d'accueil pré-rendue reste la page complète.
   */
  applyFocus(active: boolean): void {
    if (!this.isBrowser) return;
    if (active) this.doc.documentElement.setAttribute('data-focus', 'true');
    else this.doc.documentElement.removeAttribute('data-focus');
  }
}
