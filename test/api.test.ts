import { describe, expect, it, vi } from 'vitest';
import { ApiError, PulseClient } from '@/api/client';
import { statusResponseSchema } from '@/api/schemas';
import { monitorBody, statusBody } from './fixtures';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function clientReturning(response: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  return { client: new PulseClient('http://api.test', fetchMock), fetchMock };
}

describe('statusResponseSchema', () => {
  it('parses a real /api/status body', () => {
    const parsed = statusResponseSchema.parse(statusBody());
    expect(parsed.services).toHaveLength(2);
    expect(parsed.services[0]!.days).toHaveLength(90);
    expect(parsed.incidents[0]!.resolvedAt).toBeNull();
  });

  it('fills in a missing uptime summary with nulls', () => {
    const body = statusBody();
    const { uptime: _omit, ...service } = body.services[0]!;
    const parsed = statusResponseSchema.parse({ ...body, services: [service] });
    expect(parsed.services[0]!.uptime).toEqual({ '24h': null, '7d': null, '30d': null });
  });

  it('rejects an unknown state or overall status', () => {
    expect(statusResponseSchema.safeParse({ ...statusBody(), status: 'on_fire' }).success).toBe(false);
    const body = statusBody();
    body.services[0]!.state = 'sleeping';
    expect(statusResponseSchema.safeParse(body).success).toBe(false);
  });
});

describe('PulseClient', () => {
  it('fetches and validates the status', async () => {
    const { client, fetchMock } = clientReturning(jsonResponse(statusBody()));
    const status = await client.getStatus();
    expect(status.status).toBe('degraded');
    expect(fetchMock.mock.calls[0]![0]).toBe('http://api.test/api/status');
  });

  it('unwraps the { data } envelope', async () => {
    const { client, fetchMock } = clientReturning(jsonResponse({ data: monitorBody() }));
    const monitor = await client.getMonitor(1);
    expect(monitor.name).toBe('Google');
    expect(fetchMock.mock.calls[0]![0]).toBe('http://api.test/api/monitors/1');
  });

  it('parses response-time series', async () => {
    const series = {
      range: '7d',
      bucketSeconds: 3600,
      points: [{ time: '2026-10-28T10:00:00.000Z', avgLatencyMs: 409, maxLatencyMs: 492, checks: 60, failures: 0 }],
    };
    const { client, fetchMock } = clientReturning(jsonResponse({ data: series }));
    await expect(client.getResponseTimes(1, '7d')).resolves.toEqual(series);
    expect(fetchMock.mock.calls[0]![0]).toBe('http://api.test/api/monitors/1/response-times?range=7d');
  });

  it('sends the admin token and JSON body on writes', async () => {
    const { client, fetchMock } = clientReturning(jsonResponse({ data: monitorBody() }, 201));
    await client.createMonitor('secret-token-1234567', {
      name: 'Google',
      url: 'https://www.google.com',
      method: 'GET',
      expectedStatus: 200,
      intervalSeconds: 60,
      timeoutMs: 10000,
      enabled: true,
    });
    const init = fetchMock.mock.calls[0]![1]!;
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      authorization: 'Bearer secret-token-1234567',
      'content-type': 'application/json',
    });
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Google' });
  });

  it('accepts an empty 204 on delete', async () => {
    const { client } = clientReturning(new Response(null, { status: 204 }));
    await expect(client.deleteMonitor('secret-token-1234567', 3)).resolves.toBeUndefined();
  });

  it('turns API errors into ApiError with validation issues', async () => {
    const body = {
      error: 'Bad Request',
      message: 'Invalid body',
      issues: [{ path: 'timeoutMs', message: 'timeoutMs must be shorter than the interval' }],
    };
    const { client } = clientReturning(jsonResponse(body, 400));
    const error = await client.updateMonitor('t', 1, { timeoutMs: 30000 }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: 'Invalid body', issues: body.issues });
  });

  it('reports a 401 from the admin endpoints', async () => {
    const { client } = clientReturning(jsonResponse({ error: 'Unauthorized', message: 'A valid admin token is required' }, 401));
    await expect(client.deleteMonitor('wrong', 1)).rejects.toMatchObject({ status: 401 });
  });

  it('rejects responses of an unexpected shape', async () => {
    const { client } = clientReturning(jsonResponse({ hello: 'world' }));
    await expect(client.getStatus()).rejects.toThrow('unexpected format');
  });

  it('reports network failures without leaking details', async () => {
    const { client } = clientReturning(new TypeError('Failed to fetch'));
    await expect(client.getStatus()).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Could not reach') });
  });

  it('falls back to the status code for non-JSON errors', async () => {
    const { client } = clientReturning(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(client.getStatus()).rejects.toThrow('Request failed with status 502');
  });
});
