import type { ProductVariant } from '@/lib/product-detail';

/**
 * Positional structure recovered from supplier variant labels — **without naming
 * the axes**, because the names are the part that cannot be known.
 *
 * ## What this is allowed to claim, and what it is not
 *
 * The supplier sends one concatenated string per variant. CJ's `variantKey` is
 * hyphen-delimited (`Black-1XL`, `Army Green-XL`) and reaches us as
 * `provider_variant_references.source_option_label`. There are no structured
 * attribute pairs anywhere in CJ's payload — only that string and a
 * space-delimited spelling of the same thing.
 *
 * The standing rule is that a label must never be split into Sals3 option axes
 * (`create-draft.ts`, `evidence.ts`). Its stated reason is precise: *guessing
 * which token is a colour, and a wrong guess becoming a customer-facing product
 * attribute.* This module is built to respect that reason rather than route
 * around it:
 *
 * - It **does** claim the variants vary along N positions, and which values
 *   appear at each. That is arithmetic on the supplier's own delimiter, and it is
 *   verified per product by the cross-product test below — not inferred.
 * - It **never** claims a position is a "Colour" or a "Size". Nothing in the
 *   payload says so. The same two slots on a phone could be plug type and
 *   storage. An invented axis name renders to a buyer as a product attribute,
 *   which is the exact failure the rule exists to prevent.
 *
 * So a caller may render two rows of chips. A caller may **not** label those rows,
 * derive `options: [{name, value}]`, or emit them into structured data. Real named
 * axes require a person assigning them once in the portal editor, or a structured
 * source the supplier does not currently provide.
 *
 * ## Why the cross-product test has to be exact
 *
 * Splitting is only safe when the result is provably complete. If ten variants
 * yield token sets of 2 and 5, then 2 × 5 = 10 means every combination exists
 * exactly once — there is nothing left to guess about. Anything short of that
 * (a ragged set, a missing combination, a duplicate, a single token, inconsistent
 * token counts) means the label is not a clean encoding and the caller must fall
 * back to showing labels whole.
 *
 * Costs nothing at the supplier: every input is already stored. No CJ call, no
 * points, no network.
 */

/** CJ's own delimiter. Not a guess — it is the character it joins on. */
const DELIMITER = '-';

export type VariantLabelStructure = {
  /**
   * One entry per position, in the supplier's own token order, each holding that
   * position's distinct values in first-seen order.
   *
   * Deliberately unnamed — see the module note. Index is a position, not a
   * meaning.
   */
  positions: string[][];
  /** Variant id for each full combination, keyed by the tokens joined again. */
  byCombination: Map<string, string>;
};

/** The supplier's tokens for one label, in its own order. */
export function variantLabelTokens(label: string): string[] {
  return label
    .split(DELIMITER)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * The key `byCombination` is stored under. Callers build a target combination by
 * swapping one token and looking the result up — which always hits, because the
 * structure only exists when the cross-product is complete.
 */
export function variantCombinationKey(tokens: string[]): string {
  return tokens.join(DELIMITER);
}

function tokenise(label: string): string[] {
  return variantLabelTokens(label);
}

/**
 * The positional structure, or `undefined` when the labels do not encode one
 * cleanly. `undefined` is the common, expected answer — callers must have a
 * whole-label fallback and must not treat it as an error.
 */
export function deriveVariantLabelStructure(
  variants: ProductVariant[],
): VariantLabelStructure | undefined {
  // Two variants is the minimum that can encode a grid, and every variant must
  // carry a label: a partial structure would silently hide the unlabelled ones.
  if (variants.length < 2) return undefined;
  if (variants.some((variant) => variant.label === undefined)) return undefined;

  const tokenised = variants.map((variant) => tokenise(variant.label ?? ''));
  const width = tokenised[0]?.length ?? 0;

  // A single token carries no structure, and a ragged set is not an encoding.
  if (width < 2) return undefined;
  if (tokenised.some((tokens) => tokens.length !== width)) return undefined;

  const positions: string[][] = Array.from({ length: width }, () => []);

  tokenised.forEach((tokens) => {
    tokens.forEach((token, index) => {
      const values = positions[index];

      if (values !== undefined && !values.includes(token)) values.push(token);
    });
  });

  // Every position must actually vary. A position with one value is not an axis,
  // it is a constant sitting inside the label.
  if (positions.some((values) => values.length < 2)) return undefined;

  const expected = positions.reduce(
    (total, values) => total * values.length,
    1,
  );

  if (expected !== variants.length) return undefined;

  const byCombination = new Map<string, string>();

  tokenised.forEach((tokens, index) => {
    const variant = variants[index];

    if (variant !== undefined) {
      byCombination.set(variantCombinationKey(tokens), variant.id);
    }
  });

  // A duplicate label would have collapsed two variants into one key, which means
  // a buyer could pick a combination and receive the other variant's price.
  if (byCombination.size !== variants.length) return undefined;

  return { positions, byCombination };
}
