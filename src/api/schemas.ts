import { z } from 'zod';

/** HTTP methods a monitor may use (same list as the pulse API). */
export const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
/** Current state of a monitor. */
export const MONITOR_STATES = ['pending', 'up', 'down'] as const;
/** Overall status reported by `GET /api/status`. */
export const OVERALL_STATUSES = ['operational', 'degraded', 'major_outage', 'unknown'] as const;
/** Ranges accepted by the response-time endpoint. */
export const RANGES = ['24h', '7d', '30d'] as const;

const isoDate = z.iso.datetime({ offset: true });
const percent = z.number().min(0).max(100).nullable();

export const uptimeSummarySchema = z.object({
  '24h': percent,
  '7d': percent,
  '30d': percent,
});

export const dailyBarSchema = z.object({
  date: z.iso.date(),
  uptime: percent,
  totalChecks: z.number().int().nonnegative(),
  avgLatencyMs: z.number().nullable(),
});

export const incidentSchema = z.object({
  id: z.number().int(),
  monitorId: z.number().int(),
  monitorName: z.string(),
  cause: z.string(),
  startedAt: isoDate,
  resolvedAt: isoDate.nullable(),
  durationSeconds: z.number().int().nullable(),
});

export const serviceSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  url: z.string(),
  state: z.enum(MONITOR_STATES),
  lastCheckedAt: isoDate.nullable(),
  lastLatencyMs: z.number().nullable(),
  intervalSeconds: z.number().int(),
  // Missing only if a monitor was added between pulse's two queries.
  uptime: uptimeSummarySchema.optional().default({ '24h': null, '7d': null, '30d': null }),
  days: z.array(dailyBarSchema),
});

/** Body of `GET /api/status`. */
export const statusResponseSchema = z.object({
  status: z.enum(OVERALL_STATUSES),
  updatedAt: isoDate,
  services: z.array(serviceSchema),
  incidents: z.array(incidentSchema),
});

export const monitorSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  url: z.string(),
  method: z.enum(HTTP_METHODS),
  expectedStatus: z.number().int(),
  intervalSeconds: z.number().int(),
  timeoutMs: z.number().int(),
  enabled: z.boolean(),
  state: z.enum(MONITOR_STATES),
  consecutiveFailures: z.number().int(),
  lastCheckedAt: isoDate.nullable(),
  lastLatencyMs: z.number().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
  uptime: uptimeSummarySchema.optional(),
});

export const seriesPointSchema = z.object({
  time: isoDate,
  avgLatencyMs: z.number().nullable(),
  maxLatencyMs: z.number().nullable(),
  checks: z.number().int(),
  failures: z.number().int(),
});

export const responseTimesSchema = z.object({
  range: z.enum(RANGES),
  bucketSeconds: z.number().int().positive(),
  points: z.array(seriesPointSchema),
});

/** Wraps a schema in pulse's `{ data: ... }` envelope. */
export const envelope = <T extends z.ZodType>(schema: T) => z.object({ data: schema });

/** Error body returned by pulse: `{ error, message, issues? }`. */
export const apiErrorBodySchema = z.object({
  error: z.string(),
  message: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type UptimeSummary = z.infer<typeof uptimeSummarySchema>;
export type DailyBar = z.infer<typeof dailyBarSchema>;
export type Incident = z.infer<typeof incidentSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type StatusResponse = z.infer<typeof statusResponseSchema>;
export type Monitor = z.infer<typeof monitorSchema>;
export type SeriesPoint = z.infer<typeof seriesPointSchema>;
export type ResponseTimes = z.infer<typeof responseTimesSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
export type MonitorState = (typeof MONITOR_STATES)[number];
export type OverallStatus = (typeof OVERALL_STATUSES)[number];
export type Range = (typeof RANGES)[number];
export type HttpMethod = (typeof HTTP_METHODS)[number];
