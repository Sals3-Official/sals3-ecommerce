import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetCatalogAdminRateLimiter } from '@/lib/catalog-admin/rate-limit';
import { POST } from './route';

const VALID_BODY = {
  supplier: 'CJ_DROPSHIPPING',
  externalProductId: 'cj-pid-123',
  intendedSellerId: 'seller-001',
  intendedMarketCodes: ['PH'],
};

function buildRequest(options: {
  auth?: string | null;
  actorId?: string | null;
  idempotencyKey?: string | null;
  body?: unknown;
  rawBody?: string;
}): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (options.auth !== null)
    headers.set('authorization', options.auth ?? 'Bearer test-token');
  if (options.actorId !== null)
    headers.set('x-sals3-actor-id', options.actorId ?? 'actor-1');
  if (options.idempotencyKey !== null) {
    headers.set(
      'idempotency-key',
      options.idempotencyKey ?? 'idem-key-0123456789',
    );
  }

  return new Request('http://localhost/api/v1/admin/catalog/candidates/cj', {
    method: 'POST',
    headers,
    body: options.rawBody ?? JSON.stringify(options.body ?? VALID_BODY),
  });
}

describe('POST /api/v1/admin/catalog/candidates/cj', () => {
  beforeEach(() => {
    vi.stubEnv('CATALOG_ADMIN_API_TOKEN', 'test-token');
    resetCatalogAdminRateLimiter();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 when the authorization header is missing', async () => {
    const response = await POST(buildRequest({ auth: null }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('AUTHENTICATION_REQUIRED');
  });

  it('returns 401 when the bearer token is wrong', async () => {
    const response = await POST(buildRequest({ auth: 'Bearer wrong-token' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 when X-Sals3-Actor-Id is missing', async () => {
    const response = await POST(buildRequest({ actorId: null }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when Idempotency-Key is missing', async () => {
    const response = await POST(buildRequest({ idempotencyKey: null }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when Idempotency-Key is too short', async () => {
    const response = await POST(buildRequest({ idempotencyKey: 'short' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(buildRequest({ rawBody: '{not json' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for a body that fails schema validation', async () => {
    const response = await POST(
      buildRequest({ body: { ...VALID_BODY, intendedMarketCodes: [] } }),
    );
    expect(response.status).toBe(400);
  });

  it('returns 503 CATALOG_PERSISTENCE_NOT_CONFIGURED on an otherwise-valid request — never a fabricated success', async () => {
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe('CATALOG_PERSISTENCE_NOT_CONFIGURED');
    expect(body).not.toHaveProperty('candidateId');
    expect(body).not.toHaveProperty('decision');
  });

  it('sets Cache-Control: no-store on every response', async () => {
    const responses = await Promise.all([
      POST(buildRequest({ auth: null })),
      POST(buildRequest({})),
    ]);
    responses.forEach((response) => {
      expect(response.headers.get('cache-control')).toBe('no-store');
    });
  });

  it('rejects the 21st request within the rate-limit window', async () => {
    for (let i = 0; i < 20; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await POST(buildRequest({}));
    }
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).not.toBeNull();
  });

  it('never leaks internal detail in an error body', async () => {
    const response = await POST(buildRequest({ auth: null }));
    const body = await response.json();
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/stack|node_modules|Error:/i);
  });
});
