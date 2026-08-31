import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMenu, submitOrder, ApiError } from './api';

describe('fetchMenu', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses JSON on a successful response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: '1', name: 'Burger', description: '', price: 10 }],
    } as Response);

    const items = await fetchMenu('http://example.com');
    expect(items).toEqual([{ id: '1', name: 'Burger', description: '', price: 10 }]);
  });

  it('throws ApiError on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(fetchMenu('http://example.com')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('submitOrder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retries once on network failure and then succeeds', async () => {
    let calls = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error('network down'));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);
    });

    await expect(submitOrder('http://example.com', {})).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('propagates ApiError if the retry also fails on network', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(submitOrder('http://example.com', {})).rejects.toBeInstanceOf(ApiError);
  });

  it('does not retry on an explicit ok:false from the server', async () => {
    let calls = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      calls += 1;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: false, error: 'Falta email' }),
      } as Response);
    });

    await expect(submitOrder('http://example.com', {})).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(1);
  });
});
