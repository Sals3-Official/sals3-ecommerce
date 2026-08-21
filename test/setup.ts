import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

afterEach(() => {
  cleanup();
});

/**
 * jsdom implements neither `ResizeObserver` nor `matchMedia`, and components
 * that legitimately use them (the category carousel watches its own width for
 * the arrow state and honours `prefers-reduced-motion`) would otherwise have to
 * carry a guard for a browser gap that does not exist. Both stand-ins are
 * inert: nothing observed, nothing matched.
 */
if (!('ResizeObserver' in globalThis)) {
  const inert = {
    observe: () => {},
    unobserve: () => {},
    disconnect: () => {},
  };

  globalThis.ResizeObserver = function ResizeObserverStub() {
    return inert;
  } as unknown as typeof ResizeObserver;
}

if (typeof window !== 'undefined' && window.matchMedia === undefined) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}

/**
 * jsdom's built-in localStorage is unreliable under recent Node versions
 * (Node's own experimental global localStorage can shadow it, leaving
 * window.localStorage undefined). A small in-memory Storage stand-in, reset
 * before every test, is more predictable than depending on that and also
 * keeps cart-state tests isolated from each other.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
});
