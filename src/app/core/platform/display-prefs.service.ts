import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, afterNextRender, inject, signal } from '@angular/core';
import { LocalStorageService } from '../storage/local-storage.service';

export type ReaderTextSize = 'base' | 'lg' | 'xl';

const TEXT_SIZES: readonly ReaderTextSize[] = ['base', 'lg', 'xl'];
const TEXT_SIZE_KEY = 'fil.textSize';
const DIM_KEY = 'fil.dim';

/**
 * Les deux réglages de lecture (taille du texte, fond sombre), posés en
 * attribut sur `<html>` et persistés. Seule implémentation : le lecteur et la
 * vitrine du design system la partagent (fiche 24).
 */
@Service()
export class DisplayPrefsService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage = inject(LocalStorageService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly textSize = signal<ReaderTextSize>('base');
  readonly dim = signal(false);

  constructor() {
    // Après le premier rendu plutôt qu'au constructeur : la préférence vient
    // de `localStorage`, absent au pré-rendu. Un bref flash clair est accepté.
    afterNextRender(() => {
      const size = this.storage.read<ReaderTextSize>(TEXT_SIZE_KEY);
      if (size && TEXT_SIZES.includes(size)) this.setTextSize(size);
      if (this.storage.read<boolean>(DIM_KEY)) this.setDim(true);
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
}
