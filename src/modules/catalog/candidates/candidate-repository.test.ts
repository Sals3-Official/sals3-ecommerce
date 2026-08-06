import { createHash } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    supplierCandidate: { findUnique: vi.fn(), create: vi.fn() },
    idempotencyRecord: { findUnique: vi.fn(), create: vi.fn() },
    auditEvent: { create: vi.fn() },
  },
}));

// eslint-disable-next-line import/first
import prisma from '@/lib/prisma';
// eslint-disable-next-line import/first
import {
  createOrReuseCandidate,
  withIdempotency,
} from './candidate-repository';

const mockedPrisma = prisma as unknown as {
  supplierCandidate: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  idempotencyRecord: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  auditEvent: { create: ReturnType<typeof vi.fn> };
};

function hashOf(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

const INPUT = {
  supplier: 'CJ_DROPSHIPPING' as const,
  externalProductId: 'cj-pid-1',
  intendedSellerId: 'seller-001',
  intendedMarketCodes: ['PH'],
  actorId: 'actor-1',
};

describe('createOrReuseCandidate', () => {
  beforeEach(() => {
    mockedPrisma.supplierCandidate.findUnique.mockReset();
    mockedPrisma.supplierCandidate.create.mockReset();
    mockedPrisma.auditEvent.create.mockReset().mockResolvedValue({});
  });

  it('creates a new candidate and records an audit event when none exists', async () => {
    mockedPrisma.supplierCandidate.findUnique.mockResolvedValue(null);
    mockedPrisma.supplierCandidate.create.mockResolvedValue({
      id: 'cand_new',
      shortlistState: 'PREFLIGHT_PENDING',
    });

    const result = await createOrReuseCandidate(INPUT);

    expect(result).toEqual({
      candidateId: 'cand_new',
      shortlistState: 'PREFLIGHT_PENDING',
      reused: false,
    });
    expect(mockedPrisma.supplierCandidate.create).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.auditEvent.create).toHaveBeenCalledTimes(1);
  });

  it('reopens the existing candidate on an exact (supplier, externalProductId) match without creating a duplicate', async () => {
    mockedPrisma.supplierCandidate.findUnique.mockResolvedValue({
      id: 'cand_existing',
      shortlistState: 'SHORTLISTED',
    });

    const result = await createOrReuseCandidate(INPUT);

    expect(result).toEqual({
      candidateId: 'cand_existing',
      shortlistState: 'SHORTLISTED',
      reused: true,
    });
    expect(mockedPrisma.supplierCandidate.create).not.toHaveBeenCalled();
    expect(mockedPrisma.auditEvent.create).not.toHaveBeenCalled();
  });
});

describe('withIdempotency', () => {
  beforeEach(() => {
    mockedPrisma.idempotencyRecord.findUnique.mockReset();
    mockedPrisma.idempotencyRecord.create.mockReset().mockResolvedValue({});
  });

  it('runs the operation and stores the result on a fresh key', async () => {
    mockedPrisma.idempotencyRecord.findUnique.mockResolvedValue(null);
    const run = vi.fn().mockResolvedValue({
      candidateId: 'cand_1',
      shortlistState: 'PREFLIGHT_PENDING',
      reused: false,
    });

    const outcome = await withIdempotency(
      'key-1',
      { a: 1 },
      'actor-1',
      'op',
      run,
    );

    expect(outcome).toEqual({
      outcome: 'ok',
      replayed: false,
      result: {
        candidateId: 'cand_1',
        shortlistState: 'PREFLIGHT_PENDING',
        reused: false,
      },
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.idempotencyRecord.create).toHaveBeenCalledTimes(1);
  });

  it('replays the stored result for the same key and same payload without re-running the operation', async () => {
    const storedResult = {
      candidateId: 'cand_1',
      shortlistState: 'SHORTLISTED',
      reused: true,
    };
    mockedPrisma.idempotencyRecord.findUnique.mockResolvedValue({
      requestHash: hashOf({ a: 1 }),
      resultReference: storedResult,
    });
    const run = vi.fn();

    const outcome = await withIdempotency(
      'key-1',
      { a: 1 },
      'actor-1',
      'op',
      run,
    );

    expect(outcome).toEqual({
      outcome: 'ok',
      replayed: true,
      result: storedResult,
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('returns a conflict when the same key is reused with a different payload', async () => {
    mockedPrisma.idempotencyRecord.findUnique.mockResolvedValue({
      requestHash: hashOf({ a: 1 }),
      resultReference: {},
    });
    const run = vi.fn();

    const outcome = await withIdempotency(
      'key-1',
      { a: 2 },
      'actor-1',
      'op',
      run,
    );

    expect(outcome).toEqual({ outcome: 'conflict' });
    expect(run).not.toHaveBeenCalled();
  });
});
