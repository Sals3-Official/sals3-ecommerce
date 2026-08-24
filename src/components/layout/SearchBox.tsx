'use client';

import { useState, type FormEvent } from 'react';
import { SearchIcon } from '@/components/icons/Icon';
import { SEARCH_PATH } from '@/lib/search/query';

/**
 * The header search box.
 *
 * ## What this used to be
 *
 * A text input with no submit handler, no form, and a "Recent searches"
 * dropdown listing three hard-coded strings — `solar wall lamp`,
 * `wireless earbuds`, `office chair` — presented to every visitor as their own
 * history. Nobody had searched for them; Sals3 stores no search history at all.
 * The placeholder advertised "Search 1,500,000 products" over a catalogue with
 * a few dozen published.
 *
 * Both were claims the site could not stand behind, and both are gone rather
 * than reimplemented: a real recent-search list needs somewhere to store one,
 * and a real count needs to be counted.
 *
 * ## Why a real form
 *
 * `<form method="get" action="/search">` and nothing else — the browser's own
 * submit produces `/search?q=…`, so this works identically with JavaScript off.
 *
 * There is deliberately no `router.push`. Soft-navigating would have bought a
 * slightly smoother hop to a different route, at the cost of `useRouter` in a
 * component the site header renders on *every* page — including the statically
 * rendered ones and every test that mounts a page without an app router. A
 * search that leaves the current page is not the place to spend that.
 *
 * The one thing the handler does is refuse an empty term: submitting blank
 * would land on a results page announcing "no results for" something the buyer
 * never typed.
 *
 * ## Why the term arrives as a prop
 *
 * `/search` renders this header already knowing the keyword. The alternatives
 * were worse: `useSearchParams` would force every page carrying this header to
 * opt out of static rendering, and reading `window` in an effect would hydrate
 * an empty box and then fill it — a flash, and a mismatch on a controlled
 * input.
 */
type SearchBoxProps = {
  /** What the box starts with — the current keyword on `/search`, else empty. */
  initialTerm?: string;
};

export default function SearchBox({ initialTerm = '' }: SearchBoxProps) {
  const [query, setQuery] = useState(initialTerm);

  function submit(event: FormEvent<HTMLFormElement>) {
    // Nothing to search for; let the browser do the rest when there is.
    if (query.trim() === '') event.preventDefault();
  }

  return (
    <form
      method="get"
      action={SEARCH_PATH}
      onSubmit={submit}
      role="search"
      className="relative min-w-0 flex-1"
    >
      <label
        htmlFor="site-search"
        className="flex items-center gap-2 rounded-lg border border-border-strong bg-white px-3.5 py-[var(--header-field-py)] transition-[padding,border-color] duration-250 ease-out focus-within:border-brand-600"
      >
        <span className="sr-only">Search products</span>
        <SearchIcon className="text-ink-faint" />
        <input
          id="site-search"
          type="search"
          name="q"
          value={query}
          placeholder="Search products"
          maxLength={80}
          className="w-full text-sm outline-none placeholder:text-ink-faint"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
    </form>
  );
}
