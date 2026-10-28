import { describe, expect, it } from 'vitest';
import { toChartPoints } from '@/lib/series';

const point = (time: string, avg: number | null) => ({ time, avgLatencyMs: avg, maxLatencyMs: avg, checks: 5, failures: avg === null ? 5 : 0 });

describe('toChartPoints', () => {
  it('inserts a gap where buckets are missing', () => {
    const points = toChartPoints(
      [point('2026-10-28T10:00:00.000Z', 100), point('2026-10-28T10:05:00.000Z', 120), point('2026-10-28T10:30:00.000Z', 90)],
      300,
    );
    expect(points.map((item) => item.y)).toEqual([100, 120, null, 90]);
    expect(points[2]!.x).toBe(Date.parse('2026-10-28T10:10:00.000Z'));
  });

  it('keeps buckets where every check failed as gaps', () => {
    expect(toChartPoints([point('2026-10-28T10:00:00.000Z', null)], 300)[0]).toMatchObject({ y: null });
  });
});
