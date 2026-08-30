/**
 * A published legal document, as a sequence of blocks.
 *
 * Deliberately not a string of HTML or Markdown. These are binding agreements
 * whose wording came from somewhere else, so the shape that matters is "an
 * ordered list of paragraphs, headings and list items, none of which this
 * repository is allowed to rewrite". A block list makes that literal: rendering
 * cannot introduce emphasis, links or line breaks the source did not have.
 */
export type LegalBlockKind = 'section' | 'clause' | 'text' | 'item';

export type LegalBlock = {
  kind: LegalBlockKind;
  text: string;
  /** Anchor slug. Present on `section` blocks only, which is what the contents
      rail links to. */
  id?: string;
};

export type LegalDocument = {
  title: string;
  blocks: LegalBlock[];
};

/** The contents rail is derived, never hand-maintained: a second list of
    section names would be a second source of truth able to disagree. */
export function sectionsOf(
  document: LegalDocument,
): Array<{ id: string; text: string }> {
  return document.blocks
    .filter((block) => block.kind === 'section' && block.id !== undefined)
    .map((block) => ({ id: block.id!, text: block.text }));
}
