import Image from 'next/image';
import DescriptionBlockList from '@/components/product/DescriptionBlockList';
import type { OrderedListing } from '@/lib/orders/contracts';

type OrderedListingPanelProps = {
  listing: OrderedListing;
  /** The line's frozen title, for image alt text that says something. */
  title: string;
};

/**
 * The listing as it was when this order was placed.
 *
 * ## Why this exists
 *
 * A seller may rename a product, replace every photo, rewrite the description
 * and reorder the option axes. They are entitled to, and it applies to what they
 * sell next. It must not apply to what someone already bought — a buyer opening
 * a month-old order has to see the thing they chose, not whatever the listing
 * has since become. The portal freezes the record onto the order line at intent
 * creation; this renders it.
 *
 * ## Why it is collapsed
 *
 * An order page is a statement. Its job is `unit × qty = total`, where the
 * parcel is, and who it is going to. Expanding a full product page under every
 * line would bury exactly the facts a worried buyer opened the page for. So it
 * is a native `<details>`: closed by default, one disclosure per line, no client
 * JavaScript on a page that needs none, and keyboard-operable and
 * screen-reader-announced for free.
 *
 * ## Why the wording is careful
 *
 * "As ordered" and "when you ordered", never "current" or "latest". The panel's
 * whole value is that it might now differ from the live product page, and copy
 * that implied otherwise would make a genuine mismatch look like a bug in the
 * order rather than a change the seller made.
 */
export default function OrderedListingPanel({
  listing,
  title,
}: OrderedListingPanelProps) {
  const hasBody =
    listing.options.length > 0 ||
    listing.imageUrls.length > 0 ||
    listing.description !== undefined ||
    listing.specification !== undefined ||
    listing.categoryPath !== undefined;

  // A snapshot that recorded nothing renders nothing. An empty disclosure is a
  // control that punishes the press.
  if (!hasBody) return null;

  return (
    <details className="group mt-2 rounded-lg border border-border bg-surface-sunken/40">
      <summary className="cursor-pointer list-none px-3 py-2 text-[13px] text-ink-muted marker:content-none hover:text-ink">
        <span className="underline decoration-border underline-offset-4">
          Details as ordered
        </span>
      </summary>

      <div className="flex flex-col gap-4 border-t border-border px-3 py-3.5">
        <p className="text-xs text-ink-subtle">
          Saved when you placed this order. The seller may have changed the
          listing since.
        </p>

        {listing.options.length === 0 ? null : (
          <dl className="flex flex-col gap-1">
            {listing.options.map((option) => (
              <div
                key={`${option.name}-${option.value}`}
                className="flex flex-col gap-0.5 sm:grid sm:grid-cols-[minmax(0,9.375rem)_minmax(0,1fr)] sm:gap-4"
              >
                <dt className="text-[13px] text-ink-subtle">{option.name}</dt>
                <dd className="text-[13px] text-ink">{option.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {listing.imageUrls.length === 0 ? null : (
          <ul
            aria-label={`Photos of ${title} as ordered`}
            className="flex list-none flex-wrap gap-2 p-0"
          >
            {listing.imageUrls.map((url) => (
              <li key={url}>
                {/*
                  Decorative here: the line above already names the product, and
                  repeating that name on every thumbnail would read the same
                  sentence six times to a screen reader.
                */}
                <Image
                  src={url}
                  alt=""
                  width={64}
                  height={64}
                  className="h-14 w-14 rounded-md border border-border bg-surface-sunken object-cover"
                />
              </li>
            ))}
          </ul>
        )}

        {listing.description === undefined ? null : (
          <DescriptionBlockList
            blocks={listing.description}
            className="flex flex-col gap-3"
          />
        )}

        {listing.specification === undefined ? null : (
          <dl className="flex flex-col gap-1">
            {listing.specification.map((entry) => (
              <div
                key={entry.label}
                className="flex flex-col gap-0.5 sm:grid sm:grid-cols-[minmax(0,9.375rem)_minmax(0,1fr)] sm:gap-4"
              >
                <dt className="text-[13px] text-ink-subtle">{entry.label}</dt>
                <dd className="text-[13px] text-ink">{entry.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {listing.categoryPath === undefined ? null : (
          <p className="text-xs text-ink-subtle">
            Listed under {listing.categoryPath}
          </p>
        )}
      </div>
    </details>
  );
}
