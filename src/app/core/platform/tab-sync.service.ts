import { DestroyRef, PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const CHANNEL = 'fil.projects';

interface TabMessage {
  readonly id: string;
  readonly removed: boolean;
}

export type TabListener = (id: string, removed: boolean) => void;

/**
 * Prévient les autres onglets de l'application qu'un projet vient de changer
 * dans IndexedDB (écrit, renommé, supprimé). Sans cela, chaque onglet garde sa
 * propre copie du projet et la réécrit à chaque tic du chronomètre : un onglet
 * oublié en arrière-plan écrase la progression de celui qu'on utilise.
 *
 * Seul l'identifiant circule : le destinataire relit le projet dans IndexedDB,
 * qui reste la seule source. Sans `BroadcastChannel` (très vieux navigateur,
 * rendu serveur), rien ne se passe et l'application fonctionne comme avant.
 */
@Service()
export class TabSyncService {
  private readonly channel: BroadcastChannel | null;
  private readonly listeners = new Set<TabListener>();

  constructor() {
    const supported =
      isPlatformBrowser(inject(PLATFORM_ID)) && typeof BroadcastChannel !== 'undefined';
    this.channel = supported ? new BroadcastChannel(CHANNEL) : null;
    if (this.channel) {
      this.channel.onmessage = (event: MessageEvent<unknown>) => {
        const data = event.data as Partial<TabMessage> | null;
        if (typeof data?.id !== 'string') return;
        this.listeners.forEach((listener) => listener(data.id!, data.removed === true));
      };
    }
    inject(DestroyRef).onDestroy(() => this.channel?.close());
  }

  /** Le projet `id` a changé (ou, avec `removed`, a disparu) dans IndexedDB. Jamais reçu par l'onglet qui l'annonce. */
  announce(id: string, removed = false): void {
    const message: TabMessage = { id, removed };
    this.channel?.postMessage(message);
  }

  /** Écoute les changements annoncés par les autres onglets ; renvoie de quoi se désabonner. */
  listen(listener: TabListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
