import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LegalDocument } from '@/lib/legal/contracts';
import { sectionsOf } from '@/lib/legal/contracts';
import privacyPolicy from '@/lib/legal/privacy-policy';
import termsOfUse from '@/lib/legal/terms-of-use';
import LegalDocumentView from './LegalDocumentView';

function doc(blocks: LegalDocument['blocks']): LegalDocument {
  return { title: 'Terms of Use', blocks };
}

describe('LegalDocumentView', () => {
  it('gathers a run of items into one list, not one list per item', () => {
    const { container } = render(
      <LegalDocumentView
        document={doc([
          { kind: 'text', text: 'You may not use the Services if:' },
          { kind: 'item', text: 'You are legally prohibited;' },
          { kind: 'item', text: 'You are under sanctions;' },
          { kind: 'item', text: 'You have been banned.' },
        ])}
      />,
    );

    // Three separate one-item lists would be announced as three lists where
    // the document has one of three.
    expect(container.querySelectorAll('ul')).toHaveLength(1);
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('starts a new list after a paragraph interrupts the run', () => {
    const { container } = render(
      <LegalDocumentView
        document={doc([
          { kind: 'item', text: 'First list, only item.' },
          { kind: 'text', text: 'An interrupting paragraph.' },
          { kind: 'item', text: 'Second list, only item.' },
        ])}
      />,
    );

    expect(container.querySelectorAll('ul')).toHaveLength(2);
  });

  it('splits a clause into its number and its title', () => {
    render(
      <LegalDocumentView
        document={doc([
          { kind: 'clause', text: '2.1 Eligibility to Use the Services' },
        ])}
      />,
    );

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('2.1');
    expect(heading).toHaveTextContent('Eligibility to Use the Services');
  });

  it('renders a clause whole when it does not carry a number', () => {
    render(
      <LegalDocumentView
        document={doc([
          { kind: 'clause', text: 'Information that You Provide' },
        ])}
      />,
    );

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Information that You Provide',
      }),
    ).toBeInTheDocument();
  });

  it('gives every section the anchor its contents entry points at', () => {
    render(
      <LegalDocumentView
        document={doc([
          { kind: 'section', text: '1. Overview', id: '1-overview' },
        ])}
      />,
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      '1-overview',
    );
  });

  it('renders the text as text, never as markup', () => {
    render(
      <LegalDocumentView
        document={doc([
          { kind: 'text', text: 'Terms with <strong>markup</strong> inside.' },
        ])}
      />,
    );

    // A renderer that could introduce emphasis or a link could change what a
    // reader understands a binding agreement to say.
    expect(
      screen.getByText('Terms with <strong>markup</strong> inside.'),
    ).toBeInTheDocument();
  });
});

describe('the published documents', () => {
  it('carries the whole Terms of Use, not an excerpt', () => {
    const characters = termsOfUse.blocks.reduce(
      (total, block) => total + block.text.length,
      0,
    );

    // The source runs to just under 60,000 characters of prose. A generator
    // that silently dropped a container would still produce a plausible-looking
    // page, so the guard is a floor on the whole document rather than a spot
    // check on any one clause.
    expect(characters).toBeGreaterThan(55_000);
    expect(sectionsOf(termsOfUse)).toHaveLength(19);
  });

  it('keeps the arbitration agreement, which is the section most worth losing', () => {
    const headings = sectionsOf(termsOfUse).map((section) => section.text);

    expect(headings[0]).toBe('1. Overview');
    expect(headings.at(-1)).toContain('ARBITRATION AGREEMENT');
  });

  it('never treats a contact address as a section heading', () => {
    const headings = sectionsOf(privacyPolicy).map((section) => section.text);

    // The Privacy Policy's closing line is short, capitalised and unpunctuated,
    // and satisfied every other test for a heading.
    expect(headings.some((text) => text.includes('@'))).toBe(false);
    expect(headings.at(-1)).toBe('Contact Us');
  });

  it('names the registered entity both documents name', () => {
    const everything = [...termsOfUse.blocks, ...privacyPolicy.blocks]
      .map((block) => block.text)
      .join(' ');

    expect(everything).toContain('ANYTHING SUPPLIES PTY LTD');
    expect(everything).toContain('Anything Supplies Pty Ltd');
  });
});
