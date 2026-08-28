import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CheckoutAddressForm from '@/components/checkout/CheckoutAddressForm';
import type { CheckoutAddress } from '@/lib/checkout/schema';

const ADDRESS: CheckoutAddress = {
  email: 'account@example.com',
  fullName: 'Buyer One',
  phone: '+639271739215',
  addressLine1: '006 Sampaguita Ext',
  addressLine2: '',
  city: 'Quezon City',
  region: 'National Capital Region (NCR)',
  postalCode: '1119',
  country: 'PH',
};

function renderForm(emailLocked: boolean, value: CheckoutAddress = ADDRESS) {
  return render(
    <CheckoutAddressForm
      value={value}
      errors={{}}
      disabled={false}
      emailLocked={emailLocked}
      onChange={vi.fn()}
    />,
  );
}

/**
 * The contact field used to be an empty box, and whatever was typed into it
 * became the order's identity: on 2026-08-28 a buyer typed a second address,
 * paid, and the order vanished from their own list while the receipt told them
 * the checkout was not theirs. `buyer_uid` carries the identity now, so this is
 * no longer load-bearing — but an editable contact field still invites a buyer
 * to send their own receipt somewhere they cannot read it.
 */
describe('CheckoutAddressForm contact email', () => {
  it('shows the seeded account email as read-only', () => {
    renderForm(true);

    const email = screen.getByLabelText('Email');

    expect(email).toHaveValue('account@example.com');
    expect(email).toHaveAttribute('readonly');
  });

  /**
   * Read-only rather than disabled, deliberately: a disabled input is skipped
   * by keyboard navigation and is not announced with its value, which is the
   * wrong treatment for the one field the buyer most needs to read back.
   */
  it('leaves the field reachable rather than disabling it', () => {
    renderForm(true);

    expect(screen.getByLabelText('Email')).not.toBeDisabled();
  });

  it('says why it cannot be changed', () => {
    renderForm(true);

    expect(
      screen.getByText(/account email\. Orders are tied to it/i),
    ).toBeInTheDocument();
  });

  /**
   * A session carrying no email claim must get an editable field, never an
   * empty locked one the buyer has no way to fill.
   */
  it('stays editable when nothing was seeded', () => {
    renderForm(false);

    const email = screen.getByLabelText('Email');

    expect(email).not.toHaveAttribute('readonly');
    expect(
      screen.queryByText(/Orders are tied to it/i),
    ).not.toBeInTheDocument();
  });
});

describe('CheckoutAddressForm countries', () => {
  it('offers Fiji as a checkout country', () => {
    renderForm(false);

    expect(screen.getByRole('option', { name: 'Fiji' })).toHaveValue('FJ');
  });

  it('labels the Fiji city field as a city or town', () => {
    renderForm(false, {
      ...ADDRESS,
      phone: '+6793212345',
      city: 'Nadi',
      region: 'Western Division',
      postalCode: '',
      country: 'FJ',
    });

    expect(screen.getByLabelText('City or town')).toHaveValue('Nadi');
    expect(
      screen.getByText(/leave blank if your address has no postal code/i),
    ).toBeInTheDocument();
  });

  /**
   * A select, like Australia and the Philippines already use. A typed city was
   * never read by the freight quote and only ever reached the courier as a
   * string, so the list costs nothing and buys consistent data.
   */
  it('offers the towns of the selected Fiji division as a select', () => {
    renderForm(false, {
      ...ADDRESS,
      phone: '+6793212345',
      city: '',
      region: 'Western Division',
      postalCode: '',
      country: 'FJ',
    });

    const city = screen.getByLabelText('City or town');

    expect(city.tagName).toBe('SELECT');
    expect(
      [...(city as HTMLSelectElement).options]
        .filter((option) => option.value !== '')
        .map((option) => option.value),
    ).toEqual([
      'Ba',
      'Lautoka',
      'Nadi',
      'Rakiraki',
      'Sigatoka',
      'Tavua',
      'Vatukoula',
    ]);
  });

  /**
   * The list holds 25 towns; Fiji also delivers to villages and outer islands.
   * The select must say where those go rather than leave the buyer stuck.
   */
  it('tells a Fiji buyer whose village is not listed where to put it', () => {
    renderForm(false, {
      ...ADDRESS,
      phone: '+6793212345',
      city: '',
      region: 'Rotuma',
      postalCode: '',
      country: 'FJ',
    });

    const city = screen.getByLabelText('City or town');

    expect(
      [...(city as HTMLSelectElement).options]
        .filter((option) => option.value !== '')
        .map((option) => option.value),
    ).toEqual(['Ahau']);
    expect(city).toHaveAccessibleDescription(
      /nearest town.*village or island on address line 1/i,
    );
  });

  it('keeps Australia and the Philippines on the plain city label', () => {
    renderForm(false);

    expect(screen.getByLabelText('City')).toHaveValue('Quezon City');
    expect(screen.queryByLabelText('City or town')).not.toBeInTheDocument();
  });
});
