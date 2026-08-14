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

function sameMoney(left: Money, right: Money): boolean {
  return (
    left.amountMinor === right.amountMinor && left.currency === right.currency
  );
}

/**
 * Fallback variant for products whose variants have no buyer-facing option
 * axes. Prefer the available variant matching the product's displayed base
 * price, because that keeps the initial PDP price honest.
 */
export function defaultVariantFor(
  variants: ProductVariant[],
  basePrice: Money,
): ProductVariant | undefined {
  const available = variants.filter(
    (variant) => variant.availability !== 'UNAVAILABLE',
  );
  const candidates = available.length > 0 ? available : variants;

  return (
    candidates.find((variant) => sameMoney(variant.price, basePrice)) ??
    candidates[0]
  );
}

/** The first axis with nothing chosen, for the "choose a colour" hint. */
export function firstUnchosenAxis(
  axes: ProductOptionAxis[],
  selection: VariantSelection,
): ProductOptionAxis | undefined {
  return axes.find((axis) => selection[axis.name] === undefined);
}
