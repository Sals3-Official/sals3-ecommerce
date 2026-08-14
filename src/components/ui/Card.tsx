import type { ReactNode } from 'react';

/**
 * The bordered white surface the storefront uses on its `bg-surface` pages.
 *
 * Extracted because `rounded-xl border border-border bg-white p-4` was
 * copy-pasted across the PDP, and the PDP redesign needs the shape *without*
 * the padding: one bounded panel whose internal sections are separated by
 * hairlines rather than by gaps between separate cards. A stack of identical
 * cards at identical visual weight communicates no hierarchy, which is what the
 * rail looked like before.
 *
 * `divided` turns on `divide-y`, so `CardSection` children get a `border-border`
 * hairline between them and nothing at the outer edges.
 */

type CardProps = {
  children: ReactNode;
  /** Hairlines between sections. Use with `CardSection` children. */
  divided?: boolean;
  className?: string;
};

export default function Card({
  children,
  divided = false,
  className = '',
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-white ${
        divided ? 'divide-y divide-border' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

type CardSectionProps = {
  children: ReactNode;
  className?: string;
};

/** One band inside a `divided` Card. Padding lives here, not on the Card. */
export function CardSection({ children, className = '' }: CardSectionProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
