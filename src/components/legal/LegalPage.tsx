import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { sectionsOf, type LegalDocument } from '@/lib/legal/contracts';
import LegalDocumentView from './LegalDocumentView';

type LegalPageProps = {
  document: LegalDocument;
};

/** The registered entity behind SALS3.com.
 *
 * Checked against the Australian Business Register rather than copied from the
 * old site's footer, which names "Sals3 Pty. Ltd" — ACN 685 740 514 belongs to
 * ANYTHING SUPPLIES PTY LTD, with SALS3.COM registered as a business name under
 * it. Both documents say the same, so the footer is the thing that is wrong.
 */
const ENTITY = 'Anything Supplies Pty Ltd · ACN 685 740 514';

/**
 * The shell both legal documents are read in.
 *
 * ## The contents rail is the design
 *
 * The Terms run to about 65,000 characters across nineteen sections. In a
 * single scroll that is unreadable — not because of styling but because a
 * reader has no idea where they are or how much is left. The rail answers both,
 * and it is derived from the document rather than maintained beside it.
 *
 * On a phone a sticky rail would eat the screen, so the same list collapses
 * into one `<details>`. That is a native disclosure: it opens with no
 * JavaScript, and it is keyboard-operable for free.
 *
 * ## The date is a gap, and it is marked as one
 *
 * The Terms promise that "we will revise the Last Updated date", and the source
 * publishes no such date. Rendering today's date would invent a fact about a
 * binding agreement, so the bracket stays visible until someone supplies the
 * real one.
 */
export default function LegalPage({ document }: LegalPageProps) {
  const sections = sectionsOf(document);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-start gap-8 px-4 py-8 lg:grid-cols-[15.25rem_minmax(0,1fr)] lg:gap-11 lg:px-8">
        <nav
          aria-label={`${document.title} contents`}
          className="hidden lg:sticky lg:top-5 lg:flex lg:flex-col lg:gap-2.5"
        >
          <span className="text-[11px] font-semibold tracking-[0.09em] text-ink-subtle uppercase">
            Contents
          </span>
          <ul className="flex list-none flex-col gap-px border-l border-border p-0 pl-0.5">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block px-2.5 py-1.5 text-[12.5px] text-ink-muted hover:text-brand-600 hover:no-underline"
                >
                  {section.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2 border-b border-border pb-5">
            <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink lg:text-[34px]">
              {document.title}
            </h1>
            <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[12.5px] text-ink-subtle">
              <span>{ENTITY}</span>
              <span className="text-rating">Last updated [EFFECTIVE DATE]</span>
            </div>
          </div>

          <details className="rounded-[10px] border border-border-strong bg-white lg:hidden">
            {/*
              `list-none` plus the explicit chevron: `display: flex` on a
              `<summary>` suppresses the native disclosure marker in every
              engine, which left the control with no sign it opened at all.
            */}
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2.5 px-3.5 text-[13.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
              Jump to a section
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="size-3.5 shrink-0 text-ink-subtle"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </summary>
            <ul className="flex list-none flex-col border-t border-border p-0">
              {sections.map((section) => (
                <li
                  key={section.id}
                  className="border-b border-border last:border-b-0"
                >
                  <a
                    href={`#${section.id}`}
                    className="flex min-h-11 items-center px-3.5 text-[13px] text-ink-muted hover:no-underline"
                  >
                    {section.text}
                  </a>
                </li>
              ))}
            </ul>
          </details>

          <LegalDocumentView document={document} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
