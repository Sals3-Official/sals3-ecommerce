import { describe, expect, it } from 'vitest';
import {
  AdminApiErrorBodySchema,
  CATALOG_API_ERROR_CODES,
  TRANSITIONAL_ERROR_CODES,
} from './errors';
import {
  CreateCjCandidateRequestSchema,
  SupplierCandidateSchema,
} from './candidate';

const VALID_REQUEST = {
  supplier: 'CJ_DROPSHIPPING',
  externalProductId: 'cj-pid-123',
  intendedSellerId: 'seller-001',
  intendedMarketCodes: ['PH'],
};

describe('CreateCjCandidateRequestSchema', () => {
  it('parses a representative valid request', () => {
    expect(() =>
      CreateCjCandidateRequestSchema.parse(VALID_REQUEST),
    ).not.toThrow();
  });

  it('rejects a non-CJ supplier literal', () => {
    expect(() =>
      CreateCjCandidateRequestSchema.parse({
        ...VALID_REQUEST,
        supplier: 'SHOPIFY',
      }),
    ).toThrow();
  });

  it('rejects an empty intendedMarketCodes array', () => {
    expect(() =>
      CreateCjCandidateRequestSchema.parse({
        ...VALID_REQUEST,
        intendedMarketCodes: [],
      }),
    ).toThrow();
  });

  it('rejects a malformed market code', () => {
    expect(() =>
      CreateCjCandidateRequestSchema.parse({
        ...VALID_REQUEST,
        intendedMarketCodes: ['philippines'],
      }),
    ).toThrow();
  });

  it('rejects an empty externalProductId', () => {
    expect(() =>
      CreateCjCandidateRequestSchema.parse({
        ...VALID_REQUEST,
        externalProductId: '',
      }),
    ).toThrow();
  });
});

describe('SupplierCandidateSchema', () => {
  it('parses a representative fixture object', () => {
    expect(() => SupplierCandidateSchema.parse(VALID_REQUEST)).not.toThrow();
  });
});

describe('AdminApiErrorBodySchema', () => {
  it('accepts every approved spec error code', () => {
    CATALOG_API_ERROR_CODES.forEach((code) => {
      expect(() =>
        AdminApiErrorBodySchema.parse({ error: code, message: 'x' }),
      ).not.toThrow();
    });
  });

  it('accepts the transitional not-configured code', () => {
    expect(() =>
      AdminApiErrorBodySchema.parse({
        error: TRANSITIONAL_ERROR_CODES[0],
        message: 'x',
      }),
    ).not.toThrow();
  });

  it('rejects an unknown error code', () => {
    expect(() =>
      AdminApiErrorBodySchema.parse({ error: 'NOT_A_REAL_CODE', message: 'x' }),
    ).toThrow();
  });
});
