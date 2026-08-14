import { describe, expect, it } from 'vitest';
import cjImageLoader from './cj-image-loader';

/** A real `oss-cf.cjdropshipping.com` object path, verified reachable 2026-08-14. */
const CJ_IMAGE =
  'https://oss-cf.cjdropshipping.com/product/2026/01/06/06/f275193e-4ec6-481a-b398-550eac1033b0.jpg';

describe('cjImageLoader', () => {
  it('asks CJ CDN to resize and re-encode an allow-listed address', () => {
    const result = new URL(cjImageLoader({ src: CJ_IMAGE, width: 640 }));

    expect(result.searchParams.get('x-oss-process')).toBe(
      'image/resize,w_640/format,webp/quality,q_75',
    );
    expect(result.origin + result.pathname).toBe(CJ_IMAGE);
  });

  it('carries an explicit quality through instead of the default', () => {
    const result = new URL(
      cjImageLoader({ src: CJ_IMAGE, width: 128, quality: 60 }),
    );

    expect(result.searchParams.get('x-oss-process')).toBe(
      'image/resize,w_128/format,webp/quality,q_60',
    );
  });

  it('honours the second allow-listed host', () => {
    const result = cjImageLoader({
      src: 'https://cf.cjdropshipping.com/quick/product/71e57df8-e74d-4d5d-a95e-b6deb585aeac.jpg',
      width: 96,
    });

    expect(result).toContain('x-oss-process=');
  });

  it('replaces an existing instruction rather than appending a second one', () => {
    const result = new URL(
      cjImageLoader({
        src: `${CJ_IMAGE}?x-oss-process=image/resize,w_2000`,
        width: 128,
      }),
    );

    expect(result.searchParams.getAll('x-oss-process')).toEqual([
      'image/resize,w_128/format,webp/quality,q_75',
    ]);
  });

  it('preserves an unrelated query string already on the address', () => {
    const result = new URL(
      cjImageLoader({ src: `${CJ_IMAGE}?v=7`, width: 640 }),
    );

    expect(result.searchParams.get('v')).toBe('7');
    expect(result.searchParams.get('x-oss-process')).not.toBeNull();
  });

  /**
   * The loader is global, so it also receives the brand mark in the header, the
   * promo carousel slides, and the auth hero. Rewriting those would point them
   * at a CJ host that has never held them.
   */
  it('returns a local public path untouched', () => {
    expect(cjImageLoader({ src: '/sals3-logo.webp', width: 2048 })).toBe(
      '/sals3-logo.webp',
    );
    expect(
      cjImageLoader({ src: '/home-promos/air-cooler.png', width: 1152 }),
    ).toBe('/home-promos/air-cooler.png');
    expect(cjImageLoader({ src: '/login-hero.jpg', width: 640 })).toBe(
      '/login-hero.jpg',
    );
  });

  it('returns a non-allow-listed remote address untouched, never proxied', () => {
    [
      'https://evil.example.com/c.jpg',
      // Lookalike hostnames: a suffix/prefix match would let these through.
      'https://oss-cf.cjdropshipping.com.evil.example.com/c.jpg',
      'https://notcf.cjdropshipping.com/c.jpg',
      // Plain http on an otherwise allow-listed host.
      'http://cf.cjdropshipping.com/a.jpg',
    ].forEach((src) => {
      expect(cjImageLoader({ src, width: 640 })).toBe(src);
    });
  });
});
