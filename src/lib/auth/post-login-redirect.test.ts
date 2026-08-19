import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POST_LOGIN_PATH,
  getPostLoginKey,
  resolvePostLoginPath,
  withPostLoginKey,
} from './post-login-redirect';

/**
 * The rejection table is the point of this file. Every entry below is a value
 * an attacker can put in the address bar, and every one of them must end at
 * the home page rather than at a destination of their choosing.
 */
const REJECTED_VALUES: [label: string, value: unknown][] = [
  ['no parameter', undefined],
  ['empty string', ''],
  ['unknown key', 'wishlist'],
  ['the destination path itself', '/checkout'],
  ['protocol-relative URL', '//evil.example'],
  ['absolute URL', 'https://evil.example'],
  ['backslash-prefixed host', '\\evil.example'],
  ['key with a query string', 'checkout?x=1'],
  ['repeated parameter', ['checkout', 'evil']],
  ['prototype pollution attempt', '__proto__'],
  ['inherited property', 'constructor'],
  ['inherited method', 'toString'],
  ['non-string value', 42],
];

describe('post-login-redirect', () => {
  it('resolves the allow-listed key to its internal path', () => {
    expect(getPostLoginKey('checkout')).toBe('checkout');
    expect(resolvePostLoginPath(getPostLoginKey('checkout'))).toBe('/checkout');
  });

  // `/orders` joined the allow list on 2026-08-19 when the buyer orders list
  // shipped; before that, `orders` was itself one of the rejected values.
  it('resolves the orders key added by the buyer orders list', () => {
    expect(getPostLoginKey('orders')).toBe('orders');
    expect(resolvePostLoginPath(getPostLoginKey('orders'))).toBe('/orders');
  });

  it.each(REJECTED_VALUES)('sends %s home', (_label, value) => {
    expect(getPostLoginKey(value)).toBeUndefined();
    expect(resolvePostLoginPath(getPostLoginKey(value))).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
  });

  it('carries a key across the credential screens', () => {
    expect(withPostLoginKey('/signup', 'checkout')).toBe(
      '/signup?next=checkout',
    );
  });

  it('leaves the href untouched when there is no key', () => {
    expect(withPostLoginKey('/signup', undefined)).toBe('/signup');
  });
});
