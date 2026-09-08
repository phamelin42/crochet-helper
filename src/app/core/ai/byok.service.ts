import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { LocalStorageService } from '../storage/local-storage.service';
import { PROVIDERS, Provider, providerById } from './providers';

const KEY = 'fil.byok.v1';

interface Stored {
  provider: string;
  key: string;
}

/**
 * Clé d'API fournie par la personne (« bring your own key »).
 *
 * Conservée dans `localStorage`, sur son appareil, et envoyée uniquement au
 * fournisseur qu'elle a choisi. Le site ne la voit jamais : les appels partent
 * du navigateur, pas de `/api/normalize`.
 */
@Service()
export class ByokService {
  private readonly storage = inject(LocalStorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly providerId = signal<string>('anthropic');
  readonly key = signal('');
  readonly providers = PROVIDERS;

  readonly provider = computed<Provider | null>(() => providerById(this.providerId()));
  readonly configured = computed(() => this.key().trim().length > 0 && !!this.provider());

  constructor() {
    const saved = this.storage.read<Partial<Stored>>(KEY);
    if (saved?.provider) this.providerId.set(saved.provider);
    if (saved?.key) this.key.set(saved.key);
    this.destroyRef.onDestroy(() => undefined);
  }

  save(providerId: string, key: string): void {
    this.providerId.set(providerId);
    this.key.set(key.trim());
    this.storage.write(KEY, { provider: providerId, key: key.trim() } satisfies Stored);
  }

  forget(): void {
    this.key.set('');
    this.storage.write(KEY, { provider: this.providerId(), key: '' } satisfies Stored);
  }
}
