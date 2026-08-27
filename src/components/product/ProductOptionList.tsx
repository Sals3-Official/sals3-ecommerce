'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { formatMoney } from '@/lib/money';
import type { ProductOptionAxis, ProductVariant } from '@/lib/product-detail';
import type { VariantSelection } from '@/lib/product-variants';
import {
  deriveVariantLabelStructure,
  variantCombinationKey,
  variantLabelTokens,
} from '@/lib/variant-label-structure';
import {
  PRODUCT_VARIANT_CHANGE_EVENT,
  type ProductVariantChangeDetail,
} from '@/lib/product-variant-events';
import { marketHref, type MarketSegment } from '@/lib/destination/markets';
import {
  PRODUCT_MICRO_LABEL,
  PRODUCT_MICRO_LABEL_VALUE,
} from './product-label-styles';

type ProductOptionListProps = {
  /** The product's public slug — `detail.id`. */
  productId: string;
  /** The market these variant links stay inside. */
  market: MarketSegment;
  variants: ProductVariant[];
  selectedVariantId?: string;
  /**
   * Real named axes, once the portal has mapped them. Empty until then — the
   * option tables have no writer yet, so every product today falls through to
   * the unnamed presentations below.
   */
  axes?: ProductOptionAxis[];
};

/**
 * The option chooser, as **links** rather than client state.
 *
 * ## Why links
 *
 * The shipped selector held selection in `useState` and repainted the price on
 * click — client-side price mutation after paint, which ADR-016 prohibits because
 * Google crawls the landing page as HTML without running JavaScript and diffs the
 * rendered price against the feed price. Making each option a URL moves resolution
 * to the server, and gives every variant a shareable, crawlable address.
 *
 * `role="radiogroup"` / `aria-checked` is the wrong contract for something that
 * navigates, so this is a list of links with `aria-current="page"`.
 *
 * ## Four presentations, best available first
 *
 * 1. **Named axes** — the portal has mapped the supplier's values onto real
 *    options, so each row is headed by its own name ("Colour", "Size") with the
 *    chosen value beside it.
 * 2. **Token rows** — when the supplier's labels form a provable cross-product
 *    (`deriveVariantLabelStructure`), one row of chips per position. On the real
 *    corduroy jacket that is `Black / Army Green` above `S / M / L / XL / XXL`:
 *    ten variants shown as seven chips.
 * 3. **Whole labels** — labels exist but do not encode a clean grid, so each
 *    variant is one chip carrying its label verbatim.
 * 4. **Positional** — no labels yet, so `Option 1 … Option n` in payload order.
 *    Payload order is deterministic (`ORDER BY sals3_sku`), so a given number
 *    keeps pointing at the same variant between requests.
 *
 * A SKU hash is never a label, a fallback, or a title attribute: it is a SHA-256
 * digest and means nothing to a buyer.
 *
 * ## Only presentation 1 names its rows
 *
 * Named axes carry a visible heading — "Colour" above `Black / Pink / …` — because
 * a person typed that name into the portal, so it is data.
 *
 * Presentations 2, 3 and 4 stay unnamed. Nothing in the supplier payload says
 * `Black / Army Green` is a colour — CJ sends a single concatenated string and no
 * structured attributes — so a heading there would be invented, and it would
 * render to a buyer as a product attribute. See `variant-label-structure.ts`.
 *
 * ## Why token chips carry no price
 *
 * A token spans several variants, often at different prices, so a price on it
 * would be wrong. The exact price of the chosen variant is in the price block
 * above. That also drops the option area from ten currency-formatted tokens to
 * zero, which removes the price-extractor exposure rather than managing it.
 * Whole-label and positional chips *are* one variant each, so they keep a price.
 */
export default function ProductOptionList({
  productId,
  market,
  variants,
  selectedVariantId,
  axes = [],
}: ProductOptionListProps) {
  const labelId = 'product-options-label';
  const structure = deriveVariantLabelStructure(variants);
  const selected = variants.find((variant) => variant.id === selectedVariantId);

  function hrefFor(variantId: string): string {
    return marketHref(
      market,
      `/p/${productId}?variant=${encodeURIComponent(variantId)}`,
    );
  }

  function handleVariantClick(
    event: MouseEvent<HTMLAnchorElement>,
    variantId: string,
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (event.currentTarget.target !== '' &&
        event.currentTarget.target !== '_self')
    ) {
      return;
    }

    const href = event.currentTarget.getAttribute('href');

    if (href === null) return;

    event.preventDefault();

    if (`${window.location.pathname}${window.location.search}` !== href) {
      window.history.pushState(null, '', href);
    }

    window.dispatchEvent(
      new CustomEvent<ProductVariantChangeDetail>(
        PRODUCT_VARIANT_CHANGE_EVENT,
        { detail: { variantId } },
      ),
    );
  }

  /*
    The weight lives on the states, not here. With `font-medium` on the shared
    class and `font-bold` on the selected one, both land in the same cascade
    layer and Tailwind's own property ordering decides the winner — which it
    did, silently, in favour of `font-medium`. One weight per state has no
    conflict to resolve.
  */
  const CHIP =
    'block min-h-11 rounded-lg border-2 px-3 py-1.5 text-left transition-all duration-200 active:scale-[0.98]';
  /*
    The Sals3 Blue Gradient pair, split by role: `brand-blue-500` `#018cc9` is
    the selected chip's **border** (3.75:1 — fine for a component boundary,
    never for text) and `brand-blue-900` `#002b53` is its **label** (14.3:1).
    Bold as well as coloured, so the selection is not carried by hue alone.
  */
  const CHIP_ON = 'border-brand-blue-500 font-bold text-brand-blue-900';
  const CHIP_OFF =
    'border-border font-medium text-ink hover:border-border-strong';
  const CHIP_DEAD =
    'block min-h-11 rounded-lg border-2 border-border px-3 py-1.5 text-left text-ink-subtle line-through';

  function heading(note: string) {
    return (
      <>
        <h2 id={labelId} className={PRODUCT_MICRO_LABEL}>
          Choose an option
        </h2>
        <p className="mt-1 mb-2.5 text-xs text-ink-subtle">{note}</p>
      </>
    );
  }

  // ---- 0. Real named axes --------------------------------------------------
  //
  // The best case, and the only one where the rows may be *named*: these come
  // from `product_options` / `product_option_values`, which a person filled in.
  // A name from the database is data; a name inferred from a supplier string
  // would be invention. That is the whole distinction.
  //
  // Selection resolves through `resolveVariant`, which requires an exact match
  // on every axis — so swapping one value on a fully-chosen variant always
  // resolves, and a combination that does not exist returns `undefined` and
  // renders unpickable rather than linking somewhere wrong.
  if (axes.length > 0) {
    const chosen: VariantSelection = {};

    (selected?.options ?? []).forEach((option) => {
      chosen[option.name] = option.value;
    });

    /**
     * The variant a chip should link to, given what is chosen so far.
     *
     * Not `resolveVariant`: that requires every axis to be decided, which is
     * exactly what is *not* true before the buyer's first click. Here a chip only
     * has to narrow the set — it matches on the axes already chosen plus its own,
     * prefers an available variant, and leaves any remaining axes to be picked
     * next. So the first click always works instead of every chip being dead.
     */
    function chipTarget(axisName: string, value: string) {
      const wanted: VariantSelection = { ...chosen, [axisName]: value };
      const matches = variants.filter((variant) => {
        const options = variant.options ?? [];

        return Object.entries(wanted).every(([name, want]) =>
          options.some(
            (option) => option.name === name && option.value === want,
          ),
        );
      });

      return (
        matches.find((variant) => variant.availability !== 'UNAVAILABLE') ??
        matches[0]
      );
    }

    return (
      <div className="flex flex-col gap-3.5">
        {axes.map((axis, axisIndex) => {
          const axisLabelId = `product-option-axis-${axisIndex}`;
          const chosenValue = chosen[axis.name];

          return (
            <div key={axis.name}>
              {/*
                The axis is named because a person named it in the portal, so the
                buyer reads "Colour" rather than inferring it from the chips. The
                chosen value rides along on the same line: on a narrow screen the
                selected chip can wrap out of sight, and this keeps the answer to
                "which colour did I pick" next to the question.
              */}
              <h2 id={axisLabelId} className={`mb-1.5 ${PRODUCT_MICRO_LABEL}`}>
                {chosenValue === undefined ? (
                  axis.name
                ) : (
                  <>
                    {axis.name}:{' '}
                    <span className={PRODUCT_MICRO_LABEL_VALUE}>
                      {chosenValue}
                    </span>
                  </>
                )}
              </h2>
              <ul
                aria-labelledby={axisLabelId}
                className="flex flex-wrap gap-2"
              >
                {axis.values.map((value) => {
                  const target = chipTarget(axis.name, value);
                  const isChosen = chosen[axis.name] === value;
                  const reachable =
                    target !== undefined &&
                    target.availability !== 'UNAVAILABLE';

                  if (!reachable) {
                    return (
                      <li key={value}>
                        <span className={CHIP_DEAD}>
                          {value}
                          <span className="ml-1 text-[11.5px] font-normal">
                            Unavailable
                          </span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={value}>
                      <Link
                        href={hrefFor(target.id)}
                        scroll={false}
                        prefetch={false}
                        onClick={(event) =>
                          handleVariantClick(event, target.id)
                        }
                        aria-current={isChosen ? 'page' : undefined}
                        className={`${CHIP} ${isChosen ? CHIP_ON : CHIP_OFF}`}
                      >
                        {value}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    );
  }

  // ---- 1. Token rows -------------------------------------------------------
  if (structure !== undefined && selected?.label !== undefined) {
    const chosen = variantLabelTokens(selected.label);

    return (
      <>
        {heading(
          'Labels are the supplier’s own, shown as received. Groups are not named because the supplier does not name them.',
        )}
        <div className="flex flex-col gap-3">
          {structure.positions.map((values, position) => (
            <ul
              // The position's values identify the row far better than its index.
              key={values.join('|')}
              aria-labelledby={labelId}
              className="flex flex-wrap gap-2"
            >
              {values.map((token) => {
                const target = [...chosen];

                target[position] = token;

                const targetId = structure.byCombination.get(
                  variantCombinationKey(target),
                );
                const targetVariant = variants.find(
                  (variant) => variant.id === targetId,
                );
                const isChosen = chosen[position] === token;
                const unavailable =
                  targetVariant?.availability === 'UNAVAILABLE';

                if (targetId === undefined || unavailable) {
                  return (
                    <li key={token}>
                      <span className={CHIP_DEAD}>
                        {token}
                        <span className="ml-1 text-[11.5px] font-normal">
                          Unavailable
                        </span>
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={token}>
                    <Link
                      href={hrefFor(targetId)}
                      scroll={false}
                      prefetch={false}
                      onClick={(event) => handleVariantClick(event, targetId)}
                      aria-current={isChosen ? 'page' : undefined}
                      className={`${CHIP} ${isChosen ? CHIP_ON : CHIP_OFF}`}
                    >
                      {token}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </>
    );
  }

  // ---- 2 & 3. One chip per variant ----------------------------------------
  const labelled = variants.every((variant) => variant.label !== undefined);

  return (
    <>
      {heading(
        labelled
          ? 'Labels are the supplier’s own, shown as received.'
          : 'Options are numbered until the supplier’s labels reach us.',
      )}
      <ul aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {variants.map((variant, index) => {
          const isChosen = variant.id === selectedVariantId;
          const unavailable = variant.availability === 'UNAVAILABLE';
          const text = variant.label ?? `Option ${index + 1}`;

          const inner = (
            <>
              <span className="block text-[13px]">{text}</span>
              <span className="block text-[11.5px] text-ink-subtle tabular-nums">
                {formatMoney(variant.price)}
                {unavailable ? ' · Unavailable' : ''}
              </span>
            </>
          );

          return (
            <li key={variant.id}>
              {unavailable ? (
                <span className={CHIP_DEAD}>{inner}</span>
              ) : (
                <Link
                  href={hrefFor(variant.id)}
                  scroll={false}
                  prefetch={false}
                  onClick={(event) => handleVariantClick(event, variant.id)}
                  aria-current={isChosen ? 'page' : undefined}
                  className={`${CHIP} ${isChosen ? CHIP_ON : CHIP_OFF}`}
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
