import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UptimeBars from '@/components/UptimeBars.vue';
import { barTooltip, uptimeLevel } from '@/lib/uptime';
import { emptyDays } from './fixtures';

describe('uptimeLevel', () => {
  it.each([
    [null, 'none'],
    [100, 'operational'],
    [99.9, 'operational'],
    [99.89, 'minor'],
    [99, 'minor'],
    [98.99, 'partial'],
    [95, 'partial'],
    [94.99, 'major'],
    [0, 'major'],
  ] as const)('maps %s %% to %s', (uptime, level) => {
    expect(uptimeLevel(uptime)).toBe(level);
  });
});

describe('barTooltip', () => {
  it('shows the date, uptime and details of a day with checks', () => {
    expect(barTooltip({ date: '2026-10-27', uptime: 99.31, totalChecks: 1440, avgLatencyMs: 212 })).toEqual({
      date: '27 Oct 2026',
      uptime: '99.31% uptime',
      level: 'minor',
      summary: 'Minor issues',
      detail: '1,440 checks · avg 212 ms',
    });
  });

  it('says "No data" for a day without checks', () => {
    const tooltip = barTooltip({ date: '2026-08-01', uptime: null, totalChecks: 0, avgLatencyMs: null });
    expect(tooltip).toMatchObject({ date: '1 Aug 2026', uptime: 'No data', level: 'none', detail: null });
  });
});

describe('UptimeBars', () => {
  function mountBars() {
    const days = emptyDays();
    days[86] = { date: days[86]!.date, uptime: 100, totalChecks: 1440, avgLatencyMs: 120 };
    days[87] = { date: days[87]!.date, uptime: 99.5, totalChecks: 1440, avgLatencyMs: 130 };
    days[88] = { date: days[88]!.date, uptime: 97, totalChecks: 1440, avgLatencyMs: 140 };
    days[89] = { date: '2026-10-28', uptime: 42.5, totalChecks: 600, avgLatencyMs: null };
    return mount(UptimeBars, { props: { days, label: 'Google' } });
  }

  it('renders one bar per day, coloured by threshold', () => {
    const wrapper = mountBars();
    const bars = wrapper.findAll('.bar');
    expect(bars).toHaveLength(90);
    expect(bars[0]!.classes()).toContain('level-none');
    expect(bars[86]!.classes()).toContain('level-operational');
    expect(bars[87]!.classes()).toContain('level-minor');
    expect(bars[88]!.classes()).toContain('level-partial');
    expect(bars[89]!.classes()).toContain('level-major');
  });

  it('shows a tooltip with the date and uptime on hover, and hides it on leave', async () => {
    const wrapper = mountBars();
    expect(wrapper.find('[data-testid="bar-tooltip"]').exists()).toBe(false);

    await wrapper.find('[data-date="2026-10-28"]').trigger('pointerenter');
    const tooltip = wrapper.get('[data-testid="bar-tooltip"]');
    expect(tooltip.text()).toContain('28 Oct 2026');
    expect(tooltip.text()).toContain('42.50% uptime');
    expect(tooltip.text()).toContain('Major outage');
    expect(tooltip.text()).toContain('600 checks');

    await wrapper.find('.strip').trigger('mouseleave');
    expect(wrapper.find('[data-testid="bar-tooltip"]').exists()).toBe(false);
  });

  it('lets keyboard users move between days', async () => {
    const wrapper = mountBars();
    const strip = wrapper.find('.strip');
    await strip.trigger('focus');
    expect(wrapper.get('[data-testid="bar-tooltip"]').text()).toContain('28 Oct 2026');
    await strip.trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.get('[data-testid="bar-tooltip"]').text()).toContain('97% uptime');
  });

  it('summarises the bars for screen readers', () => {
    const label = mountBars().get('[role="img"]').attributes('aria-label');
    expect(label).toBe('Google: daily uptime for the last 90 days. 4 days with data, 3 with issues.');
  });
});
