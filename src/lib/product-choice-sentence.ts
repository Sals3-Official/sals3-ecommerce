/**
 * The sentence a buyer reads above two disabled purchase buttons when they have
 * not chosen an option yet.
 *
 * It is separate from the panel because it is copy with one rule in it, and the
 * rule is worth a test: the axis is named in the **seller's own word for it**,
 * lowercased, so the sentence and the chips above it agree. A generic "Choose an
 * option" would be safe and useless on a product whose chips are headed
 * "Colour".
 *
 * ## The article
 *
 * `a` or `an` from the first letter. This is the naive rule, and it is wrong for
 * the English words that sound different from how they start — "an hour", "a
 * one-piece". Axis names here come from `product_options`, which sellers fill in
 * with product attributes (Colour, Size, Style, Material, Length), and none of
 * the silent-h or long-u traps appear in that vocabulary. If one ever does, the
 * cost is one awkward article in a sentence that still says the right thing —
 * which is why this is a regex and not a dictionary.
 */
const STARTS_WITH_VOWEL = /^[aeiou]/i;

export default function chooseSentence(axisName?: string): string {
  if (axisName === undefined || axisName.trim() === '') {
    return 'Choose an option to continue.';
  }

  const noun = axisName.trim().toLowerCase();
  const article = STARTS_WITH_VOWEL.test(noun) ? 'an' : 'a';

  return `Choose ${article} ${noun} to continue.`;
}
