import type { DailyBar } from '@/api/schemas';
import { formatDay, formatPercent } from './format';

/** Colour bucket of one daily uptime bar. */
export type UptimeLevel = 'none' | 'operational' | 'minor' | 'partial' | 'major';

/** Lower bounds (inclusive) of each level, in percent. */
export const UPTIME_THRESHOLDS = {
  operational: 99.9,
  minor: 99,
  partial: 95,
} as const;

/**
 * Maps a day's uptime to a colour level:
 * at least 99.9 % is operational (green), at least 99 % a minor issue (yellow),
 * at least 95 % a partial outage (orange), anything lower a major outage (red).
 * Days without checks are `none` (grey).
 */
export function uptimeLevel(uptime: number | null): UptimeLevel {
  if (uptime === null) return 'none';
  if (uptime >= UPTIME_THRESHOLDS.operational) return 'operational';
  if (uptime >= UPTIME_THRESHOLDS.minor) return 'minor';
  if (uptime >= UPTIME_THRESHOLDS.partial) return 'partial';
  return 'major';
}

/** Human label for each level, used in tooltips and the legend. */
export const UPTIME_LEVEL_LABELS: Record<UptimeLevel, string> = {
  none: 'No data',
  operational: 'No downtime',
  minor: 'Minor issues',
  partial: 'Partial outage',
  major: 'Major outage',
};

/** What the tooltip of one daily bar shows. */
export interface BarTooltip {
  date: string;
  uptime: string;
  level: UptimeLevel;
  summary: string;
  detail: string | null;
}

/** Builds the tooltip content for one daily bar. */
export function barTooltip(bar: DailyBar): BarTooltip {
  const level = uptimeLevel(bar.uptime);
  const details: string[] = [];
  if (bar.totalChecks > 0) details.push(`${bar.totalChecks.toLocaleString('en')} checks`);
  if (bar.avgLatencyMs !== null) details.push(`avg ${bar.avgLatencyMs} ms`);
  return {
    date: formatDay(bar.date),
    uptime: bar.uptime === null ? 'No data' : `${formatPercent(bar.uptime)} uptime`,
    level,
    summary: UPTIME_LEVEL_LABELS[level],
    detail: details.length > 0 ? details.join(' · ') : null,
  };
}
