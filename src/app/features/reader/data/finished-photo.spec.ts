import { describe, expect, it, vi } from 'vitest';
import {
  FINISHED_PHOTO_QUALITIES,
  FINISHED_PHOTO_SIDE,
  MAX_FINISHED_PHOTO_BYTES,
  MAX_FINISHED_PHOTO_INPUT_BYTES,
  prepareFinishedPhoto,
} from './finished-photo';

const jpeg = new Blob(['x'], { type: 'image/jpeg' });
const resized = { blob: new Blob(['y'], { type: 'image/jpeg' }), width: 1600, height: 1200 };

describe('prepareFinishedPhoto', () => {
  it('réduit la photo à 1 600 px en JPEG et la rend telle quelle', async () => {
    const resize = vi.fn().mockResolvedValue(resized);

    const result = await prepareFinishedPhoto(jpeg, resize);

    expect(result).toEqual({ ok: true, photo: resized });
    expect(resize).toHaveBeenCalledWith(
      jpeg,
      FINISHED_PHOTO_SIDE,
      FINISHED_PHOTO_QUALITIES,
      MAX_FINISHED_PHOTO_BYTES,
    );
    expect(FINISHED_PHOTO_SIDE).toBe(1600);
    expect(FINISHED_PHOTO_QUALITIES[0]).toBe(0.85);
  });

  it('refuse un fichier de plus de 25 Mo sans même essayer de le décoder', async () => {
    const resize = vi.fn();
    const huge = { size: MAX_FINISHED_PHOTO_INPUT_BYTES + 1, type: 'image/jpeg' } as Blob;

    expect(await prepareFinishedPhoto(huge, resize)).toEqual({ ok: false, reason: 'too-large' });
    expect(resize).not.toHaveBeenCalled();
  });

  it('accepte un fichier de 25 Mo pile', async () => {
    const resize = vi.fn().mockResolvedValue(resized);
    const limit = { size: MAX_FINISHED_PHOTO_INPUT_BYTES, type: 'image/jpeg' } as Blob;

    expect((await prepareFinishedPhoto(limit, resize)).ok).toBe(true);
  });

  it.each(['application/pdf', 'text/plain', 'video/mp4'])(
    'refuse un fichier %s sans le décoder',
    async (type) => {
      const resize = vi.fn();

      expect(await prepareFinishedPhoto(new Blob(['x'], { type }), resize)).toEqual({
        ok: false,
        reason: 'not-image',
      });
      expect(resize).not.toHaveBeenCalled();
    },
  );

  it('refuse une image illisible, sans exception', async () => {
    const resize = vi.fn().mockResolvedValue(null);

    expect(await prepareFinishedPhoto(jpeg, resize)).toEqual({ ok: false, reason: 'not-image' });
  });

  it('refuse proprement quand le décodage lève une exception', async () => {
    const resize = vi.fn().mockRejectedValue(new Error('boum'));

    expect(await prepareFinishedPhoto(jpeg, resize)).toEqual({ ok: false, reason: 'not-image' });
  });

  it('laisse le décodeur juger un fichier sans type déclaré', async () => {
    const resize = vi.fn().mockResolvedValue(resized);

    expect((await prepareFinishedPhoto(new Blob(['x']), resize)).ok).toBe(true);
  });
});
