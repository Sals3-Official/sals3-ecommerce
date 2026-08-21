/** The portal's column caps the stored value here. */
const MAX_LENGTH = 60;

/**
 * `Hezekiah Aranador` becomes `Hezekiah A.`
 *
 * ## This is a preview, not the stored value
 *
 * The portal derives the published name from the same source — the order's own
 * checkout ship-to — and masks it with its own `maskDisplayName`. This exists so
 * the review form can show the buyer what their choice will look like *before*
 * they make it, which is what makes the choice informed.
 *
 * Duplicated deliberately rather than shared. The two repositories have no
 * common runtime, and a wire contract for one short string transformation would
 * cost more coupling than the duplication does. If the two ever disagree the
 * portal's wins, because the portal is the one that stores it — so a drift here
 * is a cosmetic bug on one form, never a wrong name on a published review.
 *
 * Returns `null` when there is no usable name, which the form must render as
 * "posted without a name" rather than substituting a placeholder.
 */
export default function maskBuyerName(fullName: string): string | null {
  const tokens = fullName
    .trim()
    .split(/\s+/u)
    .filter((token) => token !== '');
  const first = tokens[0];

  if (first === undefined) return null;

  const last = tokens.at(-1);
  // A single-token name keeps its whole self: there is no surname to reduce,
  // and inventing an initial from the only name somebody gave would publish a
  // letter they never supplied.
  const initial =
    last === undefined || last === first
      ? undefined
      : Array.from(last).find((character) => /\p{L}/u.test(character));

  const masked =
    initial === undefined ? first : `${first} ${initial.toLocaleUpperCase()}.`;

  // Counted by code point so an emoji or a combining mark cannot be cut in half.
  return Array.from(masked).slice(0, MAX_LENGTH).join('');
}
