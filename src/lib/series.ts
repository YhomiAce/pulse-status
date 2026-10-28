import type { SeriesPoint } from '@/api/schemas';

/** One chart point: x is a timestamp in ms, y the average latency or `null` for a gap. */
export interface ChartPoint {
  x: number;
  y: number | null;
  point: SeriesPoint | null;
}

/**
 * Turns pulse's response-time buckets into chart points. pulse only returns
 * buckets that had checks, so a `null` point is inserted wherever buckets are
 * missing; the line then breaks instead of bridging the gap.
 */
export function toChartPoints(points: readonly SeriesPoint[], bucketSeconds: number): ChartPoint[] {
  const bucketMs = bucketSeconds * 1000;
  const result: ChartPoint[] = [];
  let previous: number | null = null;
  for (const point of points) {
    const x = new Date(point.time).getTime();
    if (previous !== null && x - previous > bucketMs * 1.5) {
      result.push({ x: previous + bucketMs, y: null, point: null });
    }
    result.push({ x, y: point.avgLatencyMs, point });
    previous = x;
  }
  return result;
}
