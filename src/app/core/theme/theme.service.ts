import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, effect, inject, signal } from '@angular/core';
import { LocalStorageService } from '../storage/local-storage.service';

const KEY = 'fil.theme.v1';
const ATTRIBUTE = 'data-dim';

/**
 * Mode « assombri » : bascule un attribut sur `<html>`, que tokens.css lit pour
 * repeindre les jetons de fond. Persisté par utilisateur.
 *
 * L'attribut n'est posé que dans le navigateur : le HTML pré-rendu est servi
 * identique à tout le monde, et le mode s'applique après l'hydratation.
 */
@Service()
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage = inject(LocalStorageService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly dim = signal(false);

  constructor() {
    if (this.isBrowser) {
      this.dim.set(this.storage.read<boolean>(KEY) ?? false);
    }
    effect(() => {
      const dim = this.dim();
      if (!this.isBrowser) return;
      this.doc.documentElement.setAttribute(ATTRIBUTE, String(dim));
      this.storage.write(KEY, dim);
    });
  }

  toggle(): void {
    this.dim.update((value) => !value);
  }
}
