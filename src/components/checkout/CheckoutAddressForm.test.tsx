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

function renderForm(emailLocked: boolean) {
  return render(
    <CheckoutAddressForm
      value={ADDRESS}
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
