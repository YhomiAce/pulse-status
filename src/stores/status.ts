import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { api, ApiError, type StatusResponse } from '@/api';

/** How often the public status page refreshes, in milliseconds. */
export const REFRESH_INTERVAL_MS = 30_000;

/** Public status data from `GET /api/status`, refreshed on a timer. */
export const useStatusStore = defineStore('status', () => {
  const data = shallowRef<StatusResponse | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);
  const lastFetchedAt = ref<Date | null>(null);
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let subscribers = 0;

  const services = computed(() => data.value?.services ?? []);
  const incidents = computed(() => data.value?.incidents ?? []);

  /** Fetches the latest status. Keeps showing the previous data if it fails. */
  async function refresh(): Promise<void> {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    loading.value = true;
    try {
      data.value = await api.getStatus(current.signal);
      error.value = null;
      lastFetchedAt.value = new Date();
    } catch (cause) {
      if (current.signal.aborted) return;
      error.value = cause instanceof ApiError ? cause.message : 'Something went wrong while loading the status.';
    } finally {
      if (controller === current) {
        loading.value = false;
        controller = null;
      }
    }
  }

  function onVisibilityChange(): void {
    if (document.visibilityState !== 'visible') return;
    const age = lastFetchedAt.value ? Date.now() - lastFetchedAt.value.getTime() : Infinity;
    if (age >= REFRESH_INTERVAL_MS) void refresh();
  }

  /**
   * Starts refreshing every 30 s (skipping hidden tabs) and returns a function
   * that stops it. Several views may subscribe at once.
   */
  function startAutoRefresh(): () => void {
    subscribers += 1;
    if (subscribers === 1) {
      void refresh();
      timer = setInterval(() => {
        if (document.visibilityState !== 'hidden') void refresh();
      }, REFRESH_INTERVAL_MS);
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      subscribers -= 1;
      if (subscribers === 0 && timer !== null) {
        clearInterval(timer);
        timer = null;
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }

  return { data, error, loading, lastFetchedAt, services, incidents, refresh, startAutoRefresh };
});
