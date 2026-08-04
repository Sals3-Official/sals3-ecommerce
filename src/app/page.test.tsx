import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('Home page', () => {
  it('renders the deals and for-you sections', () => {
    render(<Home />);

    expect(
      screen.getByRole('heading', { level: 2, name: /deals/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /for you/i }),
    ).toBeInTheDocument();
  });

  it('renders the search box', () => {
    render(<Home />);

    expect(
      screen.getByPlaceholderText(/search 240,000 products/i),
    ).toBeInTheDocument();
  });

  it('renders the category navigation', () => {
    render(<Home />);

    expect(
      screen.getByRole('navigation', { name: /categories/i }),
    ).toBeInTheDocument();
  });
});
