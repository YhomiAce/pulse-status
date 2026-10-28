import type { z } from 'zod';
import {
  apiErrorBodySchema,
  envelope,
  incidentSchema,
  monitorSchema,
  responseTimesSchema,
  statusResponseSchema,
  type Incident,
  type Monitor,
  type Range,
  type ResponseTimes,
  type StatusResponse,
} from './schemas';
import type { MonitorCreateBody, MonitorUpdateBody } from '@/lib/monitor-form';

/** A failed API call, with a message that is safe to show to users. */
export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 for network and parsing failures. */
    readonly status: number,
    /** Field-level validation issues returned by the API, if any. */
    readonly issues: readonly { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}

/**
 * Small typed client for the pulse API. Every response is validated with zod,
 * so the UI never renders data of an unexpected shape.
 */
export class PulseClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {}

  /** `GET /api/status`: services, 90-day bars and recent incidents. */
  getStatus(signal?: AbortSignal): Promise<StatusResponse> {
    return this.request('/api/status', statusResponseSchema, { signal });
  }

  /** `GET /api/monitors`: every monitor, including disabled ones. */
  async listMonitors(): Promise<Monitor[]> {
    return (await this.request('/api/monitors', envelope(monitorSchema.array()))).data;
  }

  /** `GET /api/monitors/:id`. */
  async getMonitor(id: number, signal?: AbortSignal): Promise<Monitor> {
    return (await this.request(`/api/monitors/${id}`, envelope(monitorSchema), { signal })).data;
  }

  /** `GET /api/monitors/:id/response-times?range=`. */
  async getResponseTimes(id: number, range: Range, signal?: AbortSignal): Promise<ResponseTimes> {
    const path = `/api/monitors/${id}/response-times?range=${range}`;
    return (await this.request(path, envelope(responseTimesSchema), { signal })).data;
  }

  /** `GET /api/monitors/:id/incidents`. */
  async getMonitorIncidents(id: number, limit = 50, signal?: AbortSignal): Promise<Incident[]> {
    const path = `/api/monitors/${id}/incidents?limit=${limit}`;
    return (await this.request(path, envelope(incidentSchema.array()), { signal })).data;
  }

  /** `POST /api/monitors` (admin). */
  async createMonitor(token: string, body: MonitorCreateBody): Promise<Monitor> {
    return (await this.request('/api/monitors', envelope(monitorSchema), { method: 'POST', body, token })).data;
  }

  /** `PATCH /api/monitors/:id` (admin). */
  async updateMonitor(token: string, id: number, body: MonitorUpdateBody): Promise<Monitor> {
    const options = { method: 'PATCH', body, token } as const;
    return (await this.request(`/api/monitors/${id}`, envelope(monitorSchema), options)).data;
  }

  /** `DELETE /api/monitors/:id` (admin). */
  async deleteMonitor(token: string, id: number): Promise<void> {
    await this.request(`/api/monitors/${id}`, null, { method: 'DELETE', token });
  }

  private async request<T extends z.ZodType>(
    path: string,
    schema: T,
    options?: RequestOptions,
  ): Promise<z.infer<T>>;
  private async request(path: string, schema: null, options?: RequestOptions): Promise<void>;
  private async request(path: string, schema: z.ZodType | null, options: RequestOptions = {}): Promise<unknown> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.token) headers.authorization = `Bearer ${options.token}`;

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError('Could not reach the status API. Check your connection and try again.', 0);
    }

    if (!response.ok) throw await toApiError(response);
    if (schema === null) return undefined;

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ApiError('The status API returned an invalid response.', response.status);
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError('The status API returned data in an unexpected format.', response.status);
    }
    return parsed.data;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error page (e.g. a proxy); fall back to the status text.
  }
  const parsed = apiErrorBodySchema.safeParse(body);
  if (parsed.success) {
    return new ApiError(parsed.data.message, response.status, parsed.data.issues ?? []);
  }
  return new ApiError(`Request failed with status ${response.status}`, response.status);
}
