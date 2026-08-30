import type { Money } from '@/lib/money';
import type { ProductOptionAxis, ProductVariant } from '@/lib/product-detail';

/**
 * Variant selection, as pure functions.
 *
 * Kept out of the selector component so the rules can be unit-tested without a
 * DOM: which variant a selection resolves to, and which values are still
 * reachable, are the two things a buyer can be misled by.
 */

/** Option name → chosen value. A missing key means that axis is unchosen. */
export type VariantSelection = Record<string, string | undefined>;

function optionsOf(variant: ProductVariant): Record<string, string> {
  return (variant.options ?? []).reduce<Record<string, string>>(
    (acc, option) => ({ ...acc, [option.name]: option.value }),
    {},
  );
}

/**
 * The variant a selection identifies, or `undefined` while any axis is
 * unchosen.
 *
 * Requires an exact match on every axis. A partial match must not resolve: with
 * two axes chosen out of three, "the first variant that fits" would price and
 * add a variant the buyer never picked.
 */
export function resolveVariant(
  variants: ProductVariant[],
  axes: ProductOptionAxis[],
  selection: VariantSelection,
): ProductVariant | undefined {
  if (axes.some((axis) => selection[axis.name] === undefined)) {
    return undefined;
  }

  return variants.find((variant) => {
    const options = optionsOf(variant);

    return axes.every((axis) => options[axis.name] === selection[axis.name]);
  });
}

/**
 * The starting selection.
 *
 * A single variant is preselected — there is nothing to choose, and leaving it
 * unchosen would disable Add to Cart on a product with exactly one option
 * combination. With several, every axis starts empty so the buyer makes a
 * deliberate choice rather than inheriting whichever variant sorted first.
 */
export function initialSelection(
  variants: ProductVariant[],
  axes: ProductOptionAxis[],
): VariantSelection {
  if (variants.length !== 1) return {};

  const only = variants[0]!;
  const options = optionsOf(only);

  return axes.reduce<VariantSelection>(
    (acc, axis) => ({ ...acc, [axis.name]: options[axis.name] }),
    {},
  );
}

/**
 * Whether choosing `value` on `axisName` leaves at least one real variant,
 * given the other axes already chosen.
 *
 * An unselectable value is still rendered — visible and inactive — because
 * removing it from the DOM hides the fact that the combination exists but is
 * unavailable, and a screen-reader user would never discover it.
 */
export function isValueSelectable(
  variants: ProductVariant[],
  selection: VariantSelection,
  axisName: string,
  value: string,
): boolean {
  const others = Object.entries(selection).filter(
    ([name, chosen]) => name !== axisName && chosen !== undefined,
  );

  return variants.some((variant) => {
    const options = optionsOf(variant);

    if (options[axisName] !== value) return false;

    return others.every(([name, chosen]) => options[name] === chosen);
  });
}

/** "Black · XL" — display only, never parsed back into options. */
export function optionSummary(variant: ProductVariant): string | undefined {
  const options = variant.options ?? [];

  if (options.length === 0) return undefined;

  return options.map((option) => option.value).join(' · ');
}

/**
 * The variant a `?variant=` search param identifies, or `undefined`.
 *
 * Matched against real ids from the payload, which makes the payload itself the
 * allow-list: an unrecognised, malformed, or hostile value can only ever miss.
 * Callers fall back to `defaultVariantFor` — a bad id must never 404 or throw,
 * because a stale or hand-edited link is a normal thing for a buyer to arrive
 * with, and this is the crawlable surface of every product page.
 */
export function variantById(
  variants: ProductVariant[],
  id: string | undefined,
): ProductVariant | undefined {
  if (id === undefined || id === '') return undefined;

  return variants.find((variant) => variant.id === id);
}

const COUNT_WORDS = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
  'Twenty',
] as const;

/**
 * The option count as a word — "Ten supplier options", not "10".
 *
 * The rule exists so the price block carries exactly one prominent numeric
 * token: the price. A bare digit next to a currency-formatted price is the kind
 * of thing Google's price extractor can pick up, and a mismatch between the
 * rendered price and the feed price is a Merchant Center disapproval for the
 * whole domain (ADR-016).
 *
 * Above twenty this returns digits. The contract caps variants at 200, so words
 * would stop reading as prose long before that, and a bare count is not a
 * currency-formatted token — the exposure the rule guards against is a second
 * *money* string, which this never produces either way.
 */
export function variantCountInWords(count: number): string {
  return COUNT_WORDS[count] ?? String(count);
}

/** The first axis with nothing chosen, for the "choose a colour" hint. */
export function firstUnchosenAxis(
  axes: ProductOptionAxis[],
  selection: VariantSelection,
): ProductOptionAxis | undefined {
  return axes.find((axis) => selection[axis.name] === undefined);
}

/**
 * What the `From {floor}` price is not saying, in words.
 *
 * A ten-variant jacket whose floor is `US$4.51` while seven of its options are
 * `US$20` leads with a price almost no buyer will pay. The floor is still the
 * honest figure to show — it is what the feed reports and what the card the
 * buyer clicked promised — but showing it and stopping there lets the page
 * imply a distribution it never stated.
 *
 * So this counts how many options cost **more than the figure on screen**,
 * which is the fact the buyer is missing. Both numbers come from
 * `variants[].price`; nothing is estimated.
 *
 * **No money value is returned, deliberately.** `ProductPriceDisplay` documents
 * why: the price block must contain exactly one currency-formatted string,
 * because a second one is what a price extractor can pick up instead of the
 * real offer price. The mockup's version of this sentence names the higher
 * price; naming a count instead carries the same warning and keeps that rule.
 *
 * `undefined` when there is nothing to say — fewer than two variants, or a
 * currency mix, which no single floor describes.
 */
export function variantsAboveFloor(
  variants: ProductVariant[],
  floor: Money,
): { total: number; dearer: number } | undefined {
  if (variants.length < 2) return undefined;

  if (variants.some((variant) => variant.price.currency !== floor.currency)) {
    return undefined;
  }

  return {
    total: variants.length,
    dearer: variants.filter(
      (variant) => variant.price.amountMinor > floor.amountMinor,
    ).length,
  };
}
