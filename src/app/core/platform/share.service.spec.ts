import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareService } from './share.service';

const nav = navigator as unknown as Record<string, unknown>;

function setNavigator(values: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  }
}

describe('ShareService', () => {
  let service: ShareService;
  const photo = new Blob(['jpeg'], { type: 'image/jpeg' });
  const message = { title: 'Pattern Reader', text: 'J’ai terminé Chat', url: 'https://x.test/fr' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    service = TestBed.inject(ShareService);
  });

  afterEach(() => {
    for (const key of ['share', 'canShare', 'clipboard']) delete nav[key];
  });

  it('sans Web Share, il le sait et ne partage rien', async () => {
    expect(service.hasNativeShare()).toBe(false);
    expect(await service.share(message)).toBe('unsupported');
  });

  it('partage la photo quand le système accepte les fichiers', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share, canShare: () => true });

    expect(await service.share({ ...message, photo, fileName: 'ouvrage.jpg' })).toBe('shared');

    const data = share.mock.calls[0][0];
    expect(data.files).toHaveLength(1);
    expect(data.files[0].name).toBe('ouvrage.jpg');
    expect(data.files[0].type).toBe('image/jpeg');
    expect(data.text).toContain('J’ai terminé Chat');
  });

  it('retombe sur texte et lien quand le système refuse les fichiers', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share, canShare: () => false });

    expect(await service.share({ ...message, photo, fileName: 'ouvrage.jpg' })).toBe('shared');

    expect(share).toHaveBeenCalledWith({
      title: message.title,
      text: message.text,
      url: message.url,
    });
  });

  it('partage texte et lien quand il n’y a pas de photo', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share });

    await service.share(message);

    expect(share).toHaveBeenCalledWith({
      title: message.title,
      text: message.text,
      url: message.url,
    });
  });

  it('une annulation par la lectrice n’est pas une erreur', async () => {
    setNavigator({ share: vi.fn().mockRejectedValue(new DOMException('annulé', 'AbortError')) });

    expect(await service.share(message)).toBe('cancelled');
  });

  it('une autre erreur est un échec, sans exception', async () => {
    setNavigator({ share: vi.fn().mockRejectedValue(new Error('boum')) });

    expect(await service.share(message)).toBe('failed');
  });

  it('copie dans le presse-papiers, et dit quand il refuse', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ clipboard: { writeText } });
    expect(await service.copyText('bonjour')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('bonjour');

    setNavigator({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error('non')) } });
    expect(await service.copyText('bonjour')).toBe(false);
  });

  it('ne fait rien côté serveur', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const server = TestBed.inject(ShareService);

    expect(server.hasNativeShare()).toBe(false);
    expect(await server.share(message)).toBe('unsupported');
    expect(await server.copyText('x')).toBe(false);
    expect(server.download(photo, 'a.jpg')).toBe(false);
  });
});
