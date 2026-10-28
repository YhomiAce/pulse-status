import type { DailyBar } from '@/api/schemas';

/** 90 days of bars ending 2026-10-28, all without data. */
export function emptyDays(count = 90): DailyBar[] {
  const end = Date.UTC(2026, 9, 28);
  return Array.from({ length: count }, (_, index) => ({
    date: new Date(end - (count - 1 - index) * 86_400_000).toISOString().slice(0, 10),
    uptime: null,
    totalChecks: 0,
    avgLatencyMs: null,
  }));
}

/** A `GET /api/status` body shaped exactly like pulse's. */
export function statusBody() {
  const days = emptyDays();
  days[89] = { date: '2026-10-28', uptime: 100, totalChecks: 12, avgLatencyMs: 409 };
  return {
    status: 'degraded',
    updatedAt: '2026-10-28T10:36:26.160Z',
    services: [
      {
        id: 1,
        name: 'Google',
        url: 'https://www.google.com',
        state: 'up',
        lastCheckedAt: '2026-10-28T10:36:17.996Z',
        lastLatencyMs: 365,
        intervalSeconds: 60,
        uptime: { '24h': 100, '7d': 100, '30d': 100 },
        days,
      },
      {
        id: 5,
        name: 'Payments API (demo outage)',
        url: 'https://httpbin.org/status/503',
        state: 'down',
        lastCheckedAt: '2026-10-28T10:36:20.000Z',
        lastLatencyMs: null,
        intervalSeconds: 60,
        uptime: { '24h': 0, '7d': 0, '30d': 0 },
        days: emptyDays(),
      },
    ],
    incidents: [
      {
        id: 1,
        monitorId: 5,
        monitorName: 'Payments API (demo outage)',
        cause: 'Expected status 200, got 503',
        startedAt: '2026-10-28T10:26:32.340Z',
        resolvedAt: null,
        durationSeconds: null,
      },
    ],
  };
}

/** A monitor as returned by `GET /api/monitors/:id`. */
export function monitorBody() {
  return {
    id: 1,
    name: 'Google',
    url: 'https://www.google.com',
    method: 'GET',
    expectedStatus: 200,
    intervalSeconds: 60,
    timeoutMs: 10000,
    enabled: true,
    state: 'up',
    consecutiveFailures: 0,
    lastCheckedAt: '2026-10-28T10:36:17.996Z',
    lastLatencyMs: 365,
    createdAt: '2026-10-28T10:25:27.300Z',
    updatedAt: '2026-10-28T10:25:27.300Z',
    uptime: { '24h': 100, '7d': 100, '30d': 100 },
  };
}
