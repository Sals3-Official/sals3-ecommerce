import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import KlaviyoConsentBanner from './KlaviyoConsentBanner';

describe('KlaviyoConsentBanner', () => {
  it('explains analytics consent and exposes keyboard-friendly actions', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    render(<KlaviyoConsentBanner onAccept={onAccept} onDecline={onDecline} />);

    expect(
      screen.getByRole('region', { name: /analytics consent/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no passwords, payment data, session cookies/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /accept analytics/i }));
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});
