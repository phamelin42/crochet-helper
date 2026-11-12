import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, inject } from '@angular/core';

export type ShareOutcome = 'shared' | 'cancelled' | 'failed' | 'unsupported';

export interface ShareMessage {
  readonly title: string;
  readonly text: string;
  readonly url: string;
  /** Photo à joindre quand le système accepte les fichiers. */
  readonly photo?: Blob;
  readonly fileName?: string;
}

/**
 * Seul point de contact avec le partage du système (`navigator.share`), le
 * presse-papiers et le téléchargement d'un fichier : une fonctionnalité ne
 * touche jamais à `navigator` ni au `document` elle-même. Aucune requête
 * réseau : le fichier va de l'appareil à l'application choisie par la lectrice.
 */
@Service()
export class ShareService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly doc = inject(DOCUMENT);

  hasNativeShare(): boolean {
    return this.isBrowser && typeof navigator.share === 'function';
  }

  async share(message: ShareMessage): Promise<ShareOutcome> {
    if (!this.hasNativeShare()) return 'unsupported';
    const { title, text, url, photo, fileName } = message;
    let data: ShareData = { title, text, url };
    if (photo) {
      const file = new File([photo], fileName ?? 'ouvrage.jpg', {
        type: photo.type || 'image/jpeg',
      });
      // Avec un fichier, beaucoup d'applications ignorent `url` : le lien suit le texte.
      const withFile: ShareData = { title, text: `${text} ${url}`, files: [file] };
      if (typeof navigator.canShare === 'function' && navigator.canShare(withFile)) data = withFile;
    }
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      // Fermer la feuille de partage est un choix de la lectrice, pas une panne.
      return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed';
    }
  }

  async copyText(text: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  /** Enregistre un fichier sur l'appareil par un lien de téléchargement éphémère. */
  download(blob: Blob, fileName: string): boolean {
    if (!this.isBrowser || typeof URL.createObjectURL !== 'function') return false;
    const url = URL.createObjectURL(blob);
    const link = this.doc.createElement('a');
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    this.doc.body.append(link);
    link.click();
    link.remove();
    // Laisse au navigateur le temps de démarrer le téléchargement avant de libérer l'adresse.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  }
}
