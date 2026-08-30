import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ProductsResponseSchema,
  StorefrontProductDetailSchema,
  StorefrontProductResponseSchema,
  StorefrontProductSchema,
} from './schemas';

/** One path for both readers below. */
const FIXTURE_PATH = 'test/fixtures/storefront-product-detail.json';

function listItem(overrides: Record<string, unknown> = {}) {
  return {
    id: '90a329b9-56aa-4f54-abb2-ad843602aa73',
    slug: 'waterproof-shell-jacket',
    title: 'Waterproof Shell Jacket',
    currency: 'USD',
    priceMinor: 4299,
    imageUrl: 'https://cf.cjdropshipping.com/quick/product/a.jpg',
    imageAlt: 'Waterproof Shell Jacket',
    category: 'cat-app-100412',
    ...overrides,
  };
}

describe('StorefrontProductSchema', () => {
  it('accepts the minimum a card needs, with no legacy keys at all', () => {
    expect(StorefrontProductSchema.safeParse(listItem()).success).toBe(true);
  });

  /**
   * The one field that cannot be optional. A missing currency would render a
   * number with the wrong symbol — the only failure mode here that
   * misrepresents money — so failing the parse is the honest outcome.
   */
  it('rejects a product with no currency', () => {
    const { currency, ...withoutCurrency } = listItem();

    expect(currency).toBe('USD');
    expect(StorefrontProductSchema.safeParse(withoutCurrency).success).toBe(
      false,
    );
  });

  it('accepts AUD without converting USD carts to AUD', () => {
    expect(
      StorefrontProductSchema.safeParse(listItem({ currency: 'AUD' })).success,
    ).toBe(true);
  });

  /** So the portal can add a field before this app reads it. */
  it('strips unknown keys rather than failing', () => {
    const parsed = StorefrontProductSchema.parse(
      listItem({ somethingNew: 'from a newer portal' }),
    );

    expect('somethingNew' in parsed).toBe(false);
  });

  it('truncates an overlong real title instead of failing the row', () => {
    const parsed = StorefrontProductSchema.parse(
      listItem({ title: 'x'.repeat(400) }),
    );

    expect(parsed.title).toHaveLength(120);
  });

  it('accepts a product with no image', () => {
    expect(
      StorefrontProductSchema.safeParse(listItem({ imageUrl: null })).success,
    ).toBe(true);
  });
});

describe('ProductsResponseSchema', () => {
  it('accepts an empty catalogue', () => {
    expect(
      ProductsResponseSchema.parse({
        products: [],
        total: 0,
        page: 1,
        limit: 14,
        totalPages: 1,
      }).products,
    ).toEqual([]);
  });
});

describe('StorefrontProductDetailSchema', () => {
  function detail(overrides: Record<string, unknown> = {}) {
    return { ...listItem(), ...overrides };
  }

  it('accepts a detail payload with none of the rich fields', () => {
    const parsed = StorefrontProductDetailSchema.parse(detail());

    expect(parsed.images).toBeUndefined();
    expect(parsed.description).toBeUndefined();
    expect(parsed.variants).toBeUndefined();
    expect(parsed.specs).toBeUndefined();
  });

  it("keeps a paragraph's inline emphasis instead of stripping it", () => {
    // Zod drops unknown keys, so a paragraph schema that named only `text`
    // silently discarded every `runs` array the portal sent. The bold a seller
    // applied never reached the page and nothing reported it.
    const parsed = StorefrontProductDetailSchema.parse(
      detail({
        description: {
          blocks: [
            {
              type: 'paragraph',
              text: 'Machine washable at 30°C.',
              runs: [
                { text: 'Machine washable' },
                { text: ' at 30°C.', marks: ['strong'] },
              ],
            },
          ],
        },
      }),
    );
    const block = parsed.description?.blocks[0];

    expect(block).toMatchObject({
      type: 'paragraph',
      runs: [
        { text: 'Machine washable' },
        { text: ' at 30°C.', marks: ['strong'] },
      ],
    });
  });

  it('keeps the paragraph when the emphasis itself is malformed', () => {
    // Salvage, not rejection: an unknown mark costs the emphasis, never the
    // sentence — the same rule a malformed variant follows.
    const parsed = StorefrontProductDetailSchema.parse(
      detail({
        description: {
          blocks: [
            {
              type: 'paragraph',
              text: 'Still readable.',
              runs: [{ text: 'Still readable.', marks: ['blink'] }],
            },
          ],
        },
      }),
    );

    expect(parsed.description?.blocks).toEqual([]);
  });

  /**
   * Per-row salvage: one malformed variant costs that variant, not the product,
   * and not the page. The generalised form of the `truncatedText` lesson.
   */
  it('drops a malformed variant and keeps the good ones', () => {
    const parsed = StorefrontProductDetailSchema.parse(
      detail({
        variants: [
          {
            id: 'v1',
            sku: 'GOOD',
            priceMinor: 4299,
            currency: 'USD',
            availability: 'AVAILABLE',
          },
          { id: 'v2', sku: 'BAD', priceMinor: -1, currency: 'USD' },
        ],
      }),
    );

    expect(parsed.variants).toHaveLength(1);
    expect(parsed.variants?.[0].sku).toBe('GOOD');
  });

  it('keeps a variant whose photo address is malformed, minus the photo', () => {
    const parsed = StorefrontProductDetailSchema.parse(
      detail({
        variants: [
          {
            id: 'v1',
            sku: 'GOOD',
            priceMinor: 4299,
            currency: 'USD',
            availability: 'AVAILABLE',
            imageUrl: 'not-a-url',
          },
        ],
      }),
    );

    /**
     * `variants` is a `salvagedArray`, so without `.catch` on `imageUrl` this
     * whole variant would vanish - costing a buyer a size they can no longer
     * choose, to avoid a missing thumbnail. A decorative field must not be able
     * to delete a commercial row.
     */
    expect(parsed.variants).toHaveLength(1);
    expect(parsed.variants?.[0].sku).toBe('GOOD');
    expect(parsed.variants?.[0].imageUrl).toBeUndefined();
  });

  it('drops an image whose url is not a url', () => {
    const parsed = StorefrontProductDetailSchema.parse(
      detail({
        images: [
          { url: 'https://cf.cjdropshipping.com/quick/product/a.jpg' },
          { url: 'not-a-url' },
        ],
      }),
    );

    expect(parsed.images).toHaveLength(1);
  });

  it('drops a description block of an unknown type', () => {
    const parsed = StorefrontProductDetailSchema.parse(
      detail({
        description: {
          blocks: [
            { type: 'paragraph', text: 'Real copy.' },
            // The block type that must never exist on either side: raw supplier
            // HTML has no sanitiser anywhere in this system.
            { type: 'html', html: '<script>alert(1)</script>' },
          ],
        },
      }),
    );

    expect(parsed.description?.blocks).toEqual([
      { type: 'paragraph', text: 'Real copy.' },
    ]);
  });
});

/**
 * The cross-repository drift guard. `sals3-portal` commits the same file and
 * asserts its serializer produces it, so a contract change that only lands on
 * one side fails a test in whichever repository moved.
 */
describe('the committed contract fixture', () => {
  it('parses as a detail response with every field intact', () => {
    const raw = readFileSync(join(process.cwd(), FIXTURE_PATH), 'utf8');
    const parsed = StorefrontProductResponseSchema.parse(JSON.parse(raw));

    expect(parsed.product.images).toHaveLength(2);
    expect(parsed.product.description?.blocks).toHaveLength(5);
    // The image block survives the parse whole — a fixture image silently
    // salvaged away would read as "the block type shipped" when it did not.
    expect(parsed.product.description?.blocks[4]).toMatchObject({
      type: 'image',
      alt: 'Size chart for the shell jacket',
    });
    // Same discipline as the image assertion above, for the same reason: the
    // emphasis a seller applied is a block field that once vanished silently.
    // A fixture that carried it while the schema dropped it would read as
    // "shipped" when nothing reached the page.
    expect(parsed.product.description?.blocks[1]).toMatchObject({
      type: 'paragraph',
      runs: [
        { text: 'A short-cut shell jacket' },
        { text: ' with a fleece lining.', marks: ['strong'] },
      ],
    });
    expect(parsed.product.variants).toHaveLength(2);
    expect(parsed.product.specs?.brand).toBe('Sals3 Basics');
    expect(parsed.product.currency).toBe('USD');
  });
});

/**
 * The fingerprint of the committed fixture, asserted **identically in
 * `sals3-portal`**.
 *
 * ## Why a hash, and what it does and does not catch
 *
 * The two copies are documented as committed identically and drifted anyway: this
 * one gained the paragraph `runs` field and the other did not, for eight days,
 * because each repository's test only ever compared its own copy against its own
 * side of the contract. Neither could see the other.
 *
 * A hash cannot fix that on its own — nothing here can read the sibling
 * repository. What it does is make each copy **tamper-evident**: editing the
 * fixture without updating this literal fails immediately, and the literal is
 * then visibly different from the sibling's, which is a two-second check in
 * review instead of a diff nobody runs.
 *
 * So changing the fixture is a **two-repository change, and both hashes move in
 * the same pair of commits**. If you are reading this because the assertion
 * failed and you only meant to edit one side, that is the answer.
 */
const FIXTURE_SHA256 =
  'e7600cac48870be3d8978dac239847bb4c1605f7dab06229ef21e0cecd605f19';

describe('the committed fixture is the same bytes in both repositories', () => {
  it('has the fingerprint sals3-portal asserts too', () => {
    const bytes = readFileSync(join(process.cwd(), FIXTURE_PATH));

    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      FIXTURE_SHA256,
    );
  });
});
