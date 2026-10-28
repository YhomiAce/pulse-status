import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api, ApiError, type Monitor } from '@/api';
import type { MonitorCreateBody, MonitorUpdateBody } from '@/lib/monitor-form';

const TOKEN_KEY = 'pulse-status.admin-token';

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Admin session and monitor management. The admin token lives in
 * `sessionStorage`, so it is forgotten when the tab is closed.
 */
export const useAdminStore = defineStore('admin', () => {
  const token = ref<string | null>(readToken());
  const monitors = ref<Monitor[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const signedIn = computed(() => token.value !== null);

  /** Stores the admin token for this browser tab. */
  function signIn(value: string): void {
    const trimmed = value.trim();
    token.value = trimmed;
    try {
      sessionStorage.setItem(TOKEN_KEY, trimmed);
    } catch {
      // Storage may be disabled; the token still works until the page reloads.
    }
  }

  /** Forgets the admin token. */
  function signOut(): void {
    token.value = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors.
    }
  }

  function requireToken(): string {
    if (token.value === null) throw new ApiError('Enter the admin token first.', 401);
    return token.value;
  }

  /** Signs out when the API rejects the token, then rethrows. */
  async function withToken<T>(action: (value: string) => Promise<T>): Promise<T> {
    try {
      return await action(requireToken());
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        signOut();
        error.value = 'The admin token was rejected. Enter it again.';
      }
      throw cause;
    }
  }

  /** Loads every monitor, including disabled ones. */
  async function loadMonitors(): Promise<void> {
    loading.value = true;
    try {
      monitors.value = await api.listMonitors();
      error.value = null;
    } catch (cause) {
      error.value = cause instanceof ApiError ? cause.message : 'Could not load monitors.';
    } finally {
      loading.value = false;
    }
  }

  /** Creates a monitor and adds it to the list. */
  async function createMonitor(body: MonitorCreateBody): Promise<Monitor> {
    const created = await withToken((value) => api.createMonitor(value, body));
    monitors.value = [...monitors.value, created];
    return created;
  }

  /** Updates a monitor and replaces it in the list. */
  async function updateMonitor(id: number, body: MonitorUpdateBody): Promise<Monitor> {
    const updated = await withToken((value) => api.updateMonitor(value, id, body));
    monitors.value = monitors.value.map((monitor) => (monitor.id === id ? { ...updated, uptime: monitor.uptime } : monitor));
    return updated;
  }

  /** Deletes a monitor and its history. */
  async function deleteMonitor(id: number): Promise<void> {
    await withToken((value) => api.deleteMonitor(value, id));
    monitors.value = monitors.value.filter((monitor) => monitor.id !== id);
  }

  return { token, monitors, loading, error, signedIn, signIn, signOut, loadMonitors, createMonitor, updateMonitor, deleteMonitor };
});
