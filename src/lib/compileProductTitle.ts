/**
 * Compiles one product's raw catalogue attributes into the 3 title strings
 * each surface needs (build spec §4: price is the visual anchor, nothing
 * else should compete — including an overlong title). This is Stage 2
 * (data model / entities) groundwork: the live storefront feed
 * (`src/services/products.ts`) has no Brand/Material/Fit attributes yet,
 * only a single pre-formatted CJ `title` string. Do not wire this into the
 * live catalogue until a real structured product entity exists.
 *
 * Callers are responsible for keeping attribute values in ASD-STE100 plain
 * words — this compiler only joins/truncates what it is given, it does not
 * rewrite grammar or simplify vocabulary.
 */

export type ProductAttributesInput = {
  brand: string;
  itemCategory: string;
  material?: string;
  fit?: string;
  specs?: string[];
};

export type CompiledProductTitle = {
  seoTitle: string;
  cardTitle: string;
  checkoutTitle: string;
};

const CARD_TITLE_MAX_LENGTH = 60;
const CHECKOUT_TITLE_MAX_LENGTH = 35;
const ELLIPSIS = '…';

function cleanWords(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function truncateToLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const sliced = value.slice(0, maxLength - ELLIPSIS.length);
  const lastSpace = sliced.lastIndexOf(' ');
  const safe = (lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).replace(
    /[,;:.\s]+$/,
    '',
  );

  return `${safe}${ELLIPSIS}`;
}

function collectVariantParts(input: ProductAttributesInput): string[] {
  const specs = (input.specs ?? []).map(cleanWords).filter(Boolean);

  return [input.material, ...specs, input.fit]
    .filter((part): part is string => Boolean(part))
    .map(cleanWords);
}

/**
 * seoTitle: full descriptive string for SEO/PDP — brand, base name, every
 * variant attribute, in that order. cardTitle: same content, capped so a
 * runaway spec list still fits `line-clamp-2` cleanly (build spec §11.2:
 * title stays quieter than price, never the reason a card looks busy).
 * checkoutTitle: `[Base Name] – [Variant Spec]`, hard-capped under 35
 * characters so a cart/checkout row never clips on a small viewport.
 */
export function compileProductTitle(
  input: ProductAttributesInput,
): CompiledProductTitle {
  const brand = cleanWords(input.brand);
  const itemCategory = cleanWords(input.itemCategory);
  const variantParts = collectVariantParts(input);
  const variantSpec = variantParts.join(', ');

  const seoTitle = cleanWords([brand, itemCategory, ...variantParts].join(' '));

  const cardTitleFull = cleanWords(
    variantSpec
      ? `${brand} ${itemCategory} – ${variantSpec}`
      : `${brand} ${itemCategory}`,
  );
  const cardTitle = truncateToLength(cardTitleFull, CARD_TITLE_MAX_LENGTH);

  const checkoutTitleFull = variantSpec
    ? `${itemCategory} – ${variantSpec}`
    : itemCategory;
  const checkoutTitle = truncateToLength(
    checkoutTitleFull,
    CHECKOUT_TITLE_MAX_LENGTH,
  );

  return { seoTitle, cardTitle, checkoutTitle };
}
