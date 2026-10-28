<script setup lang="ts">
import {
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  LineController,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import type { Range, ResponseTimes } from '@/api/schemas';
import { toChartPoints, type ChartPoint } from '@/lib/series';

ChartJS.register(LineController, LineElement, PointElement, LinearScale, Filler, Tooltip);

const props = defineProps<{ series: ResponseTimes }>();

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const tickFormats: Record<Range, Intl.DateTimeFormatOptions> = {
  '24h': { hour: '2-digit', minute: '2-digit' },
  '7d': { weekday: 'short', day: 'numeric' },
  '30d': { day: 'numeric', month: 'short' },
};
const RANGE_HOURS: Record<Range, number> = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };
const tooltipFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

const points = computed(() => toChartPoints(props.series.points, props.series.bucketSeconds));
const hasData = computed(() => points.value.some((point) => point.y !== null));

const chartData = computed<ChartData<'line', ChartPoint[]>>(() => {
  const accent = cssVar('--accent', '#2f6fdf');
  return {
    datasets: [
      {
        label: 'Average response time',
        data: points.value,
        parsing: false,
        borderColor: accent,
        backgroundColor: /^#[0-9a-f]{6}$/i.test(accent) ? `${accent}1f` : 'rgba(47, 111, 223, 0.12)',
        fill: 'origin',
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 8,
        spanGaps: false,
      },
    ],
  };
});

const chartOptions = computed<ChartOptions<'line'>>(() => {
  const grid = cssVar('--grid', '#e1e0d9');
  const muted = cssVar('--text-muted', '#7a7a72');
  const tickFormat = new Intl.DateTimeFormat('en', tickFormats[props.series.range]);
  // Show the whole selected range, so sparse data is not stretched across the chart.
  const now = Date.now();
  const rangeMs = RANGE_HOURS[props.series.range] * 3_600_000;
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false, axis: 'x' },
    scales: {
      x: {
        type: 'linear',
        min: now - rangeMs,
        max: now,
        grid: { display: false },
        border: { color: grid },
        ticks: { color: muted, maxTicksLimit: 7, callback: (value) => tickFormat.format(new Date(Number(value))) },
      },
      y: {
        beginAtZero: true,
        grid: { color: grid },
        border: { display: false },
        ticks: { color: muted, maxTicksLimit: 5, callback: (value) => `${value} ms` },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        filter: (item: TooltipItem<'line'>) => (item.raw as ChartPoint).point !== null,
        callbacks: {
          title: (items) => (items[0] ? tooltipFormat.format(new Date(items[0].parsed.x ?? 0)) : ''),
          label: (item) => {
            const point = (item.raw as ChartPoint).point;
            if (!point) return '';
            const lines = [
              point.avgLatencyMs === null ? 'No successful checks' : `Average ${point.avgLatencyMs} ms`,
            ];
            if (point.maxLatencyMs !== null) lines.push(`Slowest ${point.maxLatencyMs} ms`);
            lines.push(`${point.checks} checks${point.failures > 0 ? `, ${point.failures} failed` : ''}`);
            return lines;
          },
        },
      },
    },
  };
});
</script>

<template>
  <div class="chart-wrap">
    <div v-if="hasData" class="chart" role="img" :aria-label="`Average response time over the last ${series.range}`">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <p v-else class="empty muted">No response-time data for this range yet.</p>
    <details v-if="hasData" class="table-view">
      <summary>Show data table</summary>
      <table>
        <thead>
          <tr><th>Time</th><th>Average</th><th>Slowest</th><th>Checks</th><th>Failed</th></tr>
        </thead>
        <tbody>
          <tr v-for="point in series.points" :key="point.time">
            <td>{{ tooltipFormat.format(new Date(point.time)) }}</td>
            <td>{{ point.avgLatencyMs ?? '-' }}{{ point.avgLatencyMs !== null ? ' ms' : '' }}</td>
            <td>{{ point.maxLatencyMs ?? '-' }}{{ point.maxLatencyMs !== null ? ' ms' : '' }}</td>
            <td>{{ point.checks }}</td>
            <td>{{ point.failures }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </div>
</template>

<style scoped>
.chart {
  position: relative;
  height: 260px;
}
.empty {
  display: grid;
  place-items: center;
  height: 200px;
  margin: 0;
}
.table-view {
  margin-top: 12px;
  font-size: 0.85rem;
}
summary {
  cursor: pointer;
  color: var(--text-secondary);
}
.table-view table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  font-variant-numeric: tabular-nums;
}
th,
td {
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border);
}
th {
  color: var(--text-muted);
  font-weight: 500;
}
.table-view tbody {
  display: block;
  max-height: 240px;
  overflow-y: auto;
}
.table-view thead,
.table-view tbody tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}
</style>
