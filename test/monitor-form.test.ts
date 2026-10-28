import { describe, expect, it } from 'vitest';
import { apiIssuesToErrors, changedFields, emptyMonitorForm, validateMonitorForm } from '@/lib/monitor-form';
import { monitorBody } from './fixtures';
import { monitorSchema } from '@/api/schemas';

const valid = () => ({ ...emptyMonitorForm(), name: 'Docs', url: 'https://docs.example.com' });

describe('validateMonitorForm', () => {
  it('accepts a valid monitor with the API defaults', () => {
    expect(validateMonitorForm(valid())).toEqual({
      ok: true,
      value: { name: 'Docs', url: 'https://docs.example.com', method: 'GET', expectedStatus: 200, intervalSeconds: 60, timeoutMs: 10000, enabled: true },
    });
  });

  it('applies the same rules as the API', () => {
    const result = validateMonitorForm({
      ...valid(),
      name: '  ',
      url: 'ftp://example.com',
      expectedStatus: 99,
      intervalSeconds: 20,
      timeoutMs: '',
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'Name is required',
        url: 'Must be an http(s) URL',
        expectedStatus: 'Expected status must be at least 100',
        intervalSeconds: 'Interval must be at least 30',
        timeoutMs: 'Timeout is required',
      },
    });
  });

  it('requires the timeout to be shorter than the interval', () => {
    const result = validateMonitorForm({ ...valid(), intervalSeconds: 30, timeoutMs: 30000 });
    expect(result).toEqual({ ok: false, errors: { timeoutMs: 'Timeout must be shorter than the interval' } });
  });

  it('rejects intervals above an hour and non-integers', () => {
    const result = validateMonitorForm({ ...valid(), intervalSeconds: 3601, expectedStatus: 200.5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.intervalSeconds).toBe('Interval must be at most 3600');
      expect(result.errors.expectedStatus).toBe('Expected status must be a whole number');
    }
  });
});

describe('changedFields', () => {
  it('returns only the fields that changed', () => {
    const monitor = monitorSchema.parse(monitorBody());
    const next = { ...validateMonitorFormValue(), name: monitor.name, url: monitor.url, intervalSeconds: 120 };
    expect(changedFields(monitor, next)).toEqual({ intervalSeconds: 120 });
  });
});

describe('apiIssuesToErrors', () => {
  it('maps API issues to form fields', () => {
    expect(apiIssuesToErrors([{ path: 'url', message: 'Must be an http(s) URL' }, { path: '', message: 'Provide at least one field' }])).toEqual({
      url: 'Must be an http(s) URL',
      form: 'Provide at least one field',
    });
  });
});

function validateMonitorFormValue() {
  const result = validateMonitorForm(valid());
  if (!result.ok) throw new Error('expected valid form');
  return result.value;
}
