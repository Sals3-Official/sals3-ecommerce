import { afterEach, describe, expect, it, vi } from 'vitest';
import isCatalogAdminRequestAuthorized from './auth';

function requestWithAuthHeader(header: string | null): Request {
  const headers = new Headers();
  if (header !== null) headers.set('authorization', header);
  return new Request('http://localhost/api/v1/admin/catalog/candidates/cj', {
    method: 'POST',
    headers,
  });
}

describe('isCatalogAdminRequestAuthorized', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects when CATALOG_ADMIN_API_TOKEN is unset', () => {
    vi.stubEnv('CATALOG_ADMIN_API_TOKEN', '');
    expect(
      isCatalogAdminRequestAuthorized(requestWithAuthHeader('Bearer anything')),
    ).toBe(false);
  });

  it('rejects a missing authorization header', () => {
    vi.stubEnv('CATALOG_ADMIN_API_TOKEN', 'secret-token');
    expect(isCatalogAdminRequestAuthorized(requestWithAuthHeader(null))).toBe(
      false,
    );
  });

  it('rejects a header without the Bearer prefix', () => {
    vi.stubEnv('CATALOG_ADMIN_API_TOKEN', 'secret-token');
    expect(
      isCatalogAdminRequestAuthorized(requestWithAuthHeader('secret-token')),
    ).toBe(false);
  });

  it('rejects a wrong token of the same length', () => {
    vi.stubEnv('CATALOG_ADMIN_API_TOKEN', 'secret-token');
    expect(
      isCatalogAdminRequestAuthorized(
        requestWithAuthHeader('Bearer wrong-tokenn'),
      ),
    ).toBe(false);
  });

  it('rejects a wrong token of a different length', () => {
    vi.stubEnv('CATALOG_ADMIN_API_TOKEN', 'secret-token');
    expect(
      isCatalogAdminRequestAuthorized(requestWithAuthHeader('Bearer short')),
    ).toBe(false);
  });

  it('accepts the correct bearer token', () => {
    vi.stubEnv('CATALOG_ADMIN_API_TOKEN', 'secret-token');
    expect(
      isCatalogAdminRequestAuthorized(
        requestWithAuthHeader('Bearer secret-token'),
      ),
    ).toBe(true);
  });
});
