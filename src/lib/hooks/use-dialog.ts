'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * The four behaviours a modal dialog owes a keyboard user, in one hook.
 *
 * `role="dialog" aria-modal="true"` is a promise to the assistive technology
 * that the rest of the page is unavailable. Markup alone does not keep it: Tab
 * still walks out of the panel into the page behind, Escape does nothing, the
 * background still scrolls, and focus is left wherever it was when the dialog
 * opened. So this hook does all four, and every dialog that uses it gets them
 * the same way:
 *
 * 1. **Escape closes.** The one dismissal every user already knows.
 * 2. **Focus moves in on open** — to the panel itself rather than the first
 *    control, so a screen reader reads the heading before it reads a star.
 * 3. **Focus returns on close** to the element that opened it. Landing back at
 *    the top of the document is how people lose their place in a long list.
 * 4. **Tab wraps inside the panel**, and the page behind cannot scroll.
 *
 * Returns the ref to put on the panel element.
 *
 * ## What it deliberately does not do
 *
 * No `inert` on the rest of the tree, and no portal. Both are real
 * improvements; neither is free, and the panel here renders at the end of a
 * fixed-position overlay above everything else, so the visual layering is
 * already correct without one.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function useDialog(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<Element | null>(null);

  // Read once per keypress rather than subscribed to: the list changes as the
  // form does, and a stale snapshot would trap focus on a control that is gone.
  const wrapTab = useCallback((event: KeyboardEvent) => {
    const panel = panelRef.current;

    if (panel === null) return;

    const stops = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((node) => node.offsetParent !== null);

    if (stops.length === 0) return;

    const first = stops[0];
    const last = stops[stops.length - 1];

    if (first === undefined || last === undefined) return;

    const leavingBackwards = event.shiftKey && document.activeElement === first;
    const leavingForwards = !event.shiftKey && document.activeElement === last;

    if (leavingBackwards) {
      event.preventDefault();
      last.focus();
    } else if (leavingForwards) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    openerRef.current = document.activeElement;
    panelRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();

        return;
      }

      if (event.key === 'Tab') wrapTab(event);
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;

      const opener = openerRef.current;

      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open, onClose, wrapTab]);

  return panelRef;
}
