import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import SiteHeaderShell from './SiteHeaderShell';

function scrollTo(offset: number) {
  act(() => {
    window.scrollY = offset;
    window.dispatchEvent(new Event('scroll'));
  });
}

afterEach(() => {
  window.scrollY = 0;
});

function banner() {
  return screen.getByRole('banner');
}

describe('SiteHeaderShell', () => {
  it('starts expanded at the top of the page and renders its children', () => {
    render(
      <SiteHeaderShell>
        <p>header content</p>
      </SiteHeaderShell>,
    );

    expect(banner()).toHaveAttribute('data-compact', 'false');
    expect(screen.getByText('header content')).toBeInTheDocument();
  });

  it('compacts only past the upper threshold', () => {
    render(
      <SiteHeaderShell>
        <p>header content</p>
      </SiteHeaderShell>,
    );

    scrollTo(60);
    expect(banner()).toHaveAttribute('data-compact', 'false');

    scrollTo(80);
    expect(banner()).toHaveAttribute('data-compact', 'true');
  });

  it('holds the compact state inside the dead band so it cannot chatter', () => {
    render(
      <SiteHeaderShell>
        <p>header content</p>
      </SiteHeaderShell>,
    );

    scrollTo(80);
    scrollTo(40);
    expect(banner()).toHaveAttribute('data-compact', 'true');

    scrollTo(20);
    expect(banner()).toHaveAttribute('data-compact', 'false');
  });

  it('starts compact when the page loads at a restored scroll position', () => {
    window.scrollY = 400;

    render(
      <SiteHeaderShell>
        <p>header content</p>
      </SiteHeaderShell>,
    );

    expect(banner()).toHaveAttribute('data-compact', 'true');
  });
});
