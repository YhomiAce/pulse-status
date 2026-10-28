import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { MonitorState } from '@/api/schemas';
import StatusBanner from '@/components/StatusBanner.vue';
import { bannerFor, stateInfo } from '@/lib/status';

const services = (...states: MonitorState[]) => states.map((state) => ({ state }));

describe('bannerFor', () => {
  it('says all systems are operational when everything is up', () => {
    expect(bannerFor('operational', services('up', 'up', 'up'))).toEqual({
      tone: 'operational',
      title: 'All systems operational',
      detail: '3 services running normally.',
    });
  });

  it('mentions services still waiting for a first check', () => {
    expect(bannerFor('operational', services('up', 'pending')).detail).toBe('1 service still waiting for a first check.');
  });

  it('reports a partial outage with the number of services down', () => {
    expect(bannerFor('degraded', services('up', 'down', 'up', 'down'))).toEqual({
      tone: 'degraded',
      title: 'Partial outage',
      detail: '2 of 4 services are down.',
    });
    expect(bannerFor('degraded', services('up', 'down')).detail).toBe('1 of 2 services is down.');
  });

  it('reports a major outage when everything is down', () => {
    expect(bannerFor('major_outage', services('down', 'down'))).toMatchObject({ tone: 'major', title: 'Major outage' });
  });

  it('handles unknown status and an empty service list', () => {
    expect(bannerFor('unknown', services('pending'))).toMatchObject({ tone: 'unknown', title: 'Checking services' });
    expect(bannerFor('operational', [])).toMatchObject({ tone: 'unknown', title: 'No services monitored yet' });
  });
});

describe('stateInfo', () => {
  it('labels each monitor state', () => {
    expect(stateInfo('up')).toEqual({ tone: 'operational', label: 'Operational' });
    expect(stateInfo('down')).toEqual({ tone: 'major', label: 'Down' });
    expect(stateInfo('pending')).toEqual({ tone: 'unknown', label: 'Pending' });
  });
});

describe('StatusBanner', () => {
  it('renders the title, detail and tone class', () => {
    const wrapper = mount(StatusBanner, { props: { status: 'degraded', services: services('up', 'down') } });
    const banner = wrapper.get('[data-testid="status-banner"]');
    expect(banner.classes()).toContain('tone-degraded');
    expect(banner.text()).toContain('Partial outage');
    expect(banner.text()).toContain('1 of 2 services is down.');
    expect(banner.attributes('role')).toBe('status');
  });
});
