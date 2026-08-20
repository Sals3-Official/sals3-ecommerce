import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProductPayloadDetail } from './schemas';

/**
 * The image-host allow-list, exercised with and without the Cloudflare R2
 * host configured. `R2_IMAGE_HOST` is computed at module load from
 * `NEXT_PUBLIC_R2_IMAGE_BASE_URL`, so each case re-imports the mappers behind
 * a stubbed env rather than mutating a shared module.
 */

const R2_BASE_URL = 'https://pub-fixture.r2.dev';
const R2_IMAGE_URL = `${R2_BASE_URL}/seller-media/p1/photo.webp`;
const CJ_IMAGE_URL = 'https://cf.cjdropshipping.com/quick/product/a.jpg';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadMappers(r2BaseUrl?: string) {
  vi.resetModules();

  if (r2BaseUrl !== undefined) {
    vi.stubEnv('NEXT_PUBLIC_R2_IMAGE_BASE_URL', r2BaseUrl);
  }

  return import('./mappers');
}

function detailPayload(
  overrides: Partial<ProductPayloadDetail> = {},
): ProductPayloadDetail {
  return {
    id: 'p1',
    slug: 'a-real-product',
    title: 'A Real Product',
    currency: 'USD',
    priceMinor: 4299,
    category: 'cat-app-100412',
    imageUrl: CJ_IMAGE_URL,
    imageAlt: 'A Real Product',
    ...overrides,
  } as ProductPayloadDetail;
}

describe('getAllowedProductImageUrl with the R2 host configured', () => {
  it('accepts an address on the configured R2 public host', async () => {
    const { getAllowedProductImageUrl } = await loadMappers(R2_BASE_URL);

    expect(getAllowedProductImageUrl(R2_IMAGE_URL)).toBe(R2_IMAGE_URL);
  });

  it('still accepts the CJ CDN hosts', async () => {
    const { getAllowedProductImageUrl } = await loadMappers(R2_BASE_URL);

    expect(getAllowedProductImageUrl(CJ_IMAGE_URL)).toBe(CJ_IMAGE_URL);
  });

  it('rejects every other host, so the env var cannot widen the list past itself', async () => {
    const { getAllowedProductImageUrl } = await loadMappers(R2_BASE_URL);

    expect(
      getAllowedProductImageUrl('https://evil.example.com/photo.webp'),
    ).toBeUndefined();
  });
});

describe('getAllowedProductImageUrl without the R2 host', () => {
  it('drops an R2 address when the env var is unset', async () => {
    const { getAllowedProductImageUrl } = await loadMappers();

    expect(getAllowedProductImageUrl(R2_IMAGE_URL)).toBeUndefined();
  });

  it('drops an R2 address when the env var is not a parseable https URL', async () => {
    const { getAllowedProductImageUrl } = await loadMappers('not a url');

    expect(getAllowedProductImageUrl(R2_IMAGE_URL)).toBeUndefined();
  });
});

describe('toProductDetail description image blocks', () => {
  const blocks = [
    { type: 'paragraph' as const, text: 'A short-cut shell jacket.' },
    { type: 'image' as const, url: R2_IMAGE_URL, alt: 'Size chart' },
    {
      type: 'image' as const,
      url: 'https://evil.example.com/injected.webp',
      alt: 'Injected',
    },
  ];

  it('keeps an allow-listed image block and drops a disallowed one, never the text', async () => {
    const { toProductDetail } = await loadMappers(R2_BASE_URL);

    const detail = toProductDetail(detailPayload({ description: { blocks } }));

    expect(detail.description).toEqual([
      { type: 'paragraph', text: 'A short-cut shell jacket.' },
      { type: 'image', url: R2_IMAGE_URL, alt: 'Size chart' },
    ]);
  });

  it('falls back to the product title when the wire carries no alt', async () => {
    const { toProductDetail } = await loadMappers(R2_BASE_URL);

    const detail = toProductDetail(
      detailPayload({
        description: {
          blocks: [{ type: 'image' as const, url: R2_IMAGE_URL }],
        },
      }),
    );

    expect(detail.description).toEqual([
      { type: 'image', url: R2_IMAGE_URL, alt: 'A Real Product' },
    ]);
  });

  it('omits the description entirely when every block was an unrenderable image', async () => {
    const { toProductDetail } = await loadMappers();

    const detail = toProductDetail(
      detailPayload({
        description: {
          blocks: [{ type: 'image' as const, url: R2_IMAGE_URL, alt: 'x' }],
        },
      }),
    );

    expect(detail.description).toBeUndefined();
  });
});
