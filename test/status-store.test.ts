import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { statusResponseSchema } from '@/api/schemas';
import { statusBody } from './fixtures';

const getStatus = vi.fn();
vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api')>();
  return { ...actual, api: { getStatus: (...args: unknown[]) => getStatus(...args) } };
});

const { useStatusStore, REFRESH_INTERVAL_MS } = await import('@/stores/status');
const { ApiError } = await import('@/api');

describe('status store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    getStatus.mockReset().mockResolvedValue(statusResponseSchema.parse(statusBody()));
  });
  afterEach(() => vi.useRealTimers());

  it('loads at once, then refreshes every 30 seconds until stopped', async () => {
    const store = useStatusStore();
    const stop = store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(0);
    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(store.services).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
    expect(getStatus).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS * 3);
    expect(getStatus).toHaveBeenCalledTimes(2);
  });

  it('keeps the last data and shows an error when a refresh fails', async () => {
    const store = useStatusStore();
    await store.refresh();
    getStatus.mockRejectedValueOnce(new ApiError('Could not reach the status API.', 0));
    await store.refresh();
    expect(store.error).toBe('Could not reach the status API.');
    expect(store.data?.status).toBe('degraded');
  });
});
