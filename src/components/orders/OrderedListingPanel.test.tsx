import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OrderedListing } from '@/lib/orders/contracts';
import OrderedListingPanel from './OrderedListingPanel';

const LISTING: OrderedListing = {
  options: [
    { name: 'Colour', value: 'Army Green' },
    { name: 'Size', value: 'L' },
  ],
  imageUrls: [
    'https://cf.cjdropshipping.com/frozen/cover.jpg',
    'https://cf.cjdropshipping.com/frozen/back.jpg',
  ],
  description: [
    { type: 'heading', level: 2, text: 'About this jacket' },
    { type: 'paragraph', text: 'Corduroy, cotton, regular fit.' },
  ],
  specification: [
    { label: 'Material', value: '100% Cotton' },
    { label: 'Fit Type', value: 'Regular Fit' },
  ],
  specs: { brand: 'Generic', condition: 'NEW' },
  categoryPath: 'Apparel & Accessories > Clothing > Outerwear',
};

const TITLE = "Men's Casual Retro Corduroy Jacket Coat";

describe('OrderedListingPanel', () => {
  it('renders the frozen axes, gallery, description and specification', () => {
    const { container } = render(
      <OrderedListingPanel listing={LISTING} title={TITLE} />,
    );

    expect(screen.getByText('Colour')).toBeInTheDocument();
    expect(screen.getByText('Army Green')).toBeInTheDocument();
    expect(screen.getByText('About this jacket')).toBeInTheDocument();
    expect(screen.getByText('100% Cotton')).toBeInTheDocument();
    expect(screen.getByText(/Outerwear/)).toBeInTheDocument();
    // `querySelectorAll`, not `getAllByRole('img')`: the thumbnails carry
    // `alt=""` because the line above already names the product, and a
    // decorative image is correctly absent from the accessibility tree. The
    // list itself is what carries the name.
    expect(
      within(
        screen.getByRole('list', { name: `Photos of ${TITLE} as ordered` }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  /**
   * An order page is a statement. The record is there for the buyer who needs
   * it, not in front of the arithmetic everyone else opened the page for.
   */
  it('is closed until the buyer asks for it', () => {
    const { container } = render(
      <OrderedListingPanel listing={LISTING} title={TITLE} />,
    );

    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });

  /**
   * The panel's whole value is that it may now differ from the live product
   * page, so the copy must not claim to be current.
   */
  it('says when the record was taken, and that the listing may have changed', () => {
    render(<OrderedListingPanel listing={LISTING} title={TITLE} />);

    // In the document, not `toBeVisible`: a closed `<details>` hides its own
    // contents, which is the behaviour the test above asserts on purpose.
    expect(
      screen.getByText(/Saved when you placed this order/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/may have changed the listing since/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/current listing/i)).not.toBeInTheDocument();
  });

  it('renders nothing when the snapshot recorded nothing', () => {
    const { container } = render(
      <OrderedListingPanel
        listing={{ options: [], imageUrls: [] }}
        title={TITLE}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the sections it has and omits the ones it does not', () => {
    render(
      <OrderedListingPanel
        listing={{
          options: [{ name: 'Size', value: 'L' }],
          imageUrls: [],
        }}
        title={TITLE}
      />,
    );

    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText(/Listed under/)).not.toBeInTheDocument();
  });

  /** No `dangerouslySetInnerHTML` anywhere in the description path. */
  it('escapes text rather than interpreting it as markup', () => {
    render(
      <OrderedListingPanel
        listing={{
          options: [],
          imageUrls: [],
          description: [
            { type: 'paragraph', text: '<script>alert(1)</script> Cotton.' },
          ],
        }}
        title={TITLE}
      />,
    );

    expect(
      screen.getByText(/<script>alert\(1\)<\/script> Cotton\./),
    ).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
