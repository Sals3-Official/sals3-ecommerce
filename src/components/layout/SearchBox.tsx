'use client';

import { useId, useState } from 'react';
import { SearchIcon } from '@/components/icons/Icon';

const RECENT_SEARCHES = ['solar wall lamp', 'wireless earbuds', 'office chair'];

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const listboxId = useId();

  function selectRecent(term: string) {
    setQuery(term);
    setOpen(false);
  }

  return (
    <div className="relative max-w-xl flex-1">
      <label
        htmlFor="site-search"
        className="flex items-center gap-2 rounded-lg border border-border-strong bg-white px-3.5 py-2.5"
      >
        <span className="sr-only">Search products</span>
        <SearchIcon className="text-ink-faint" />
        <input
          id="site-search"
          type="search"
          value={query}
          placeholder="Search 240,000 products"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          className="w-full text-sm outline-none placeholder:text-ink-faint"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        />
      </label>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute top-[46px] right-0 left-0 z-40 rounded-xl border border-border bg-white p-2 shadow-[0_12px_32px_rgba(11,44,77,0.14)]"
        >
          <div className="px-2.5 py-1.5 text-xs text-ink-faint">
            Recent searches
          </div>
          {RECENT_SEARCHES.map((term) => (
            <button
              key={term}
              type="button"
              role="option"
              aria-selected={false}
              className="block w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface"
              onMouseDown={() => selectRecent(term)}
            >
              {term}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
