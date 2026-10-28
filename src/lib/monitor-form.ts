import { z } from 'zod';
import { HTTP_METHODS, type HttpMethod, type Monitor } from '@/api/schemas';

/** Allowed check interval in seconds, as enforced by pulse. */
export const INTERVAL_RANGE = { min: 30, max: 3600 } as const;
/** Allowed request timeout in milliseconds, as enforced by pulse. */
export const TIMEOUT_RANGE = { min: 1000, max: 30000 } as const;

/** Values edited in the monitor form. Number inputs can be empty, hence `number | ''`. */
export interface MonitorFormValues {
  name: string;
  url: string;
  method: HttpMethod;
  expectedStatus: number | '';
  intervalSeconds: number | '';
  timeoutMs: number | '';
  enabled: boolean;
}

const integer = (label: string, min: number, max: number) =>
  z
    .number({ error: `${label} is required` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

/**
 * Client-side copy of pulse's monitor rules, so the form can explain problems
 * before the request is sent. pulse validates again on the server.
 */
export const monitorFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name must be at most 120 characters'),
    url: z
      .string()
      .trim()
      .min(1, 'URL is required')
      .max(2048, 'URL must be at most 2048 characters')
      .pipe(z.url({ protocol: /^https?$/, message: 'Must be an http(s) URL' })),
    method: z.enum(HTTP_METHODS),
    expectedStatus: integer('Expected status', 100, 599),
    intervalSeconds: integer('Interval', INTERVAL_RANGE.min, INTERVAL_RANGE.max),
    timeoutMs: integer('Timeout', TIMEOUT_RANGE.min, TIMEOUT_RANGE.max),
    enabled: z.boolean(),
  })
  .refine((value) => value.timeoutMs < value.intervalSeconds * 1000, {
    message: 'Timeout must be shorter than the interval',
    path: ['timeoutMs'],
  });

/** Body of `POST /api/monitors`. */
export type MonitorCreateBody = z.infer<typeof monitorFormSchema>;
/** Body of `PATCH /api/monitors/:id`. */
export type MonitorUpdateBody = Partial<MonitorCreateBody>;

/** Field name to error message. */
export type FieldErrors = Partial<Record<keyof MonitorFormValues | 'form', string>>;

/** Result of validating the form. */
export type FormValidation =
  | { ok: true; value: MonitorCreateBody }
  | { ok: false; errors: FieldErrors };

/** Default values of a new monitor (the API's defaults). */
export function emptyMonitorForm(): MonitorFormValues {
  return { name: '', url: '', method: 'GET', expectedStatus: 200, intervalSeconds: 60, timeoutMs: 10000, enabled: true };
}

/** Form values for editing an existing monitor. */
export function monitorToForm(monitor: Monitor): MonitorFormValues {
  const { name, url, method, expectedStatus, intervalSeconds, timeoutMs, enabled } = monitor;
  return { name, url, method, expectedStatus, intervalSeconds, timeoutMs, enabled };
}

/** Validates form values against the API's rules. */
export function validateMonitorForm(values: MonitorFormValues): FormValidation {
  const input = {
    ...values,
    expectedStatus: values.expectedStatus === '' ? undefined : values.expectedStatus,
    intervalSeconds: values.intervalSeconds === '' ? undefined : values.intervalSeconds,
    timeoutMs: values.timeoutMs === '' ? undefined : values.timeoutMs,
  };
  const result = monitorFormSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = (issue.path[0] ?? 'form') as keyof FieldErrors;
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}

/** Only the fields that differ from the stored monitor, for a minimal PATCH. */
export function changedFields(original: Monitor, next: MonitorCreateBody): MonitorUpdateBody {
  const changes: MonitorUpdateBody = {};
  for (const key of Object.keys(next) as (keyof MonitorCreateBody)[]) {
    if (next[key] !== original[key]) Object.assign(changes, { [key]: next[key] });
  }
  return changes;
}

/** Maps API validation issues (`path: "timeoutMs"`) onto form fields. */
export function apiIssuesToErrors(issues: readonly { path: string; message: string }[]): FieldErrors {
  const fields = new Set<string>(Object.keys(emptyMonitorForm()));
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path.split('.')[0] ?? '';
    const key = (fields.has(field) ? field : 'form') as keyof FieldErrors;
    errors[key] ??= issue.message;
  }
  return errors;
}
