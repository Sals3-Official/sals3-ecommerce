import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FreeShippingNotice from './FreeShippingNotice';

describe('FreeShippingNotice', () => {
  it('states the offer without a dollar figure or a named country', () => {
    render(<FreeShippingNotice />);

    expect(
      screen.getByText('Free Standard delivery on qualifying orders'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Confirmed once your address is known, at checkout.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
  });
});
