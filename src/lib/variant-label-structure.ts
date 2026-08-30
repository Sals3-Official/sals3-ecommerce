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
 * ## Why the split still has to be provable, and where it stopped being exact
 *
 * Splitting is only safe when the tokens themselves are unambiguous: a ragged
 * set, a duplicate label, a single token or inconsistent token counts means the
 * label is not a clean encoding and the caller must fall back to showing labels
 * whole.
 *
 * A **missing combination is not one of those.** Requiring the cross-product to
 * equal the variant count exactly was the original rule and it refused a shape
 * that is ordinary in apparel. The live tactical pants sells 52 variants over 8
 * colour-and-gender values by 8 sizes — 64 combinations, 12 of which do not
 * exist, systematically: the `Male`/`Men` values carry `5XL` and `6XL` and no
 * `M`, the `Female`/`Women` values carry `M` and stop at `4XL`. That is
 * womenswear sizing, and the buyer met all 52 labels whole because of it.
 *
 * Nothing about a hole has to be guessed, and this module's only renderer was
 * already built for one: `ProductOptionList` swaps a token, misses in
 * `byCombination`, and draws a disabled `Unavailable` chip. The exactness test
 * was stricter than its own consumer needed.
 *
 * ## What replaces it
 *
 * A sparse grid is offered only when it is a genuine compression of the flat
 * list — when the chips a buyer scans (the sum of the position sizes) is fewer
 * than one chip per variant. Three variants labelled `A-1`, `B-2`, `C-3` are a
 * 3 × 3 grid holding its diagonal: six chips to reach three products, four of
 * them dead. That is a loss, so it stays flat. 16 chips instead of 52 is not.
 *
 * A complete grid is unaffected and still passes on exactness alone, which is
 * what keeps a full 2 × 2 — where the two counts are equal — working.
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
 * swapping one token and looking the result up.
 *
 * **That lookup can miss.** A sparse grid is offered now, so an absent entry is
 * the normal way of saying that combination is not purchasable, and the caller
 * must render it as unavailable rather than treat it as an error.
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
  // What the buyer scans as rows of chips, against what the flat fallback costs
  // them — one chip per variant.
  const chipCount = positions.reduce(
    (total, values) => total + values.length,
    0,
  );

  // Completeness first, so a full 2 x 2 — four variants, four chips — is not
  // refused by the compression test. `>=` keeps the break-even sparse case flat:
  // the same number of chips with some of them dead is a loss, not a tie.
  if (expected !== variants.length && chipCount >= variants.length) {
    return undefined;
  }

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
