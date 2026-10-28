<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DailyBar } from '@/api/schemas';
import { barTooltip, uptimeLevel } from '@/lib/uptime';

const props = defineProps<{
  days: readonly DailyBar[];
  /** Accessible name of the chart, e.g. the service name. */
  label: string;
}>();

const activeIndex = ref<number | null>(null);
const active = computed(() => {
  if (activeIndex.value === null) return null;
  const bar = props.days[activeIndex.value];
  return bar ? { bar, tooltip: barTooltip(bar) } : null;
});
/** Tooltip position as a percentage of the strip, clamped so it stays inside. */
const tooltipLeft = computed(() => {
  if (activeIndex.value === null || props.days.length === 0) return '50%';
  const centre = ((activeIndex.value + 0.5) / props.days.length) * 100;
  return `${Math.min(Math.max(centre, 12), 88)}%`;
});

const summary = computed(() => {
  const withData = props.days.filter((day) => day.uptime !== null).length;
  const issues = props.days.filter((day) => {
    const level = uptimeLevel(day.uptime);
    return level !== 'none' && level !== 'operational';
  }).length;
  return `${props.label}: daily uptime for the last ${props.days.length} days. ${withData} days with data, ${issues} with issues.`;
});

function show(index: number): void {
  activeIndex.value = index;
}

function hide(): void {
  activeIndex.value = null;
}

function onKeydown(event: KeyboardEvent): void {
  const last = props.days.length - 1;
  if (last < 0) return;
  const current = activeIndex.value ?? last;
  const moves: Record<string, number> = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: last };
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  activeIndex.value = Math.min(Math.max(next, 0), last);
}
</script>

<template>
  <div class="uptime-bars">
    <div
      class="strip"
      role="img"
      tabindex="0"
      :aria-label="summary"
      @mouseleave="hide"
      @blur="hide"
      @focus="activeIndex ??= days.length - 1"
      @keydown="onKeydown"
    >
      <span
        v-for="(day, index) in days"
        :key="day.date"
        class="hit"
        :data-date="day.date"
        @pointerenter="show(index)"
        @click="show(index)"
      >
        <span class="bar" :class="[`level-${uptimeLevel(day.uptime)}`, { active: index === activeIndex }]" />
      </span>
    </div>
    <div
      v-if="active"
      class="tooltip"
      role="tooltip"
      :style="{ left: tooltipLeft }"
      data-testid="bar-tooltip"
    >
      <div class="tt-date">{{ active.tooltip.date }}</div>
      <div class="tt-row">
        <span class="swatch" :class="`level-${active.tooltip.level}`" aria-hidden="true" />
        <strong>{{ active.tooltip.uptime }}</strong>
      </div>
      <div class="tt-summary">{{ active.tooltip.summary }}</div>
      <div v-if="active.tooltip.detail" class="tt-detail">{{ active.tooltip.detail }}</div>
    </div>
    <div class="axis" aria-hidden="true">
      <span>{{ days.length }} days ago</span>
      <span>Today</span>
    </div>
  </div>
</template>

<style scoped>
.uptime-bars {
  position: relative;
}
.strip {
  display: flex;
  height: 34px;
  align-items: stretch;
  border-radius: 4px;
}
.hit {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  padding: 0 1px;
  cursor: default;
}
.bar {
  flex: 1;
  border-radius: 2px;
  transition: opacity 0.12s;
}
.strip:hover .bar:not(.active),
.strip:focus-visible .bar:not(.active) {
  opacity: 0.55;
}
.level-none {
  background: var(--none);
}
.level-operational {
  background: var(--good);
}
.level-minor {
  background: var(--warning);
}
.level-partial {
  background: var(--serious);
}
.level-major {
  background: var(--critical);
}
.axis {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 0.75rem;
  color: var(--text-muted);
}
.tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  z-index: 10;
  min-width: 170px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  font-size: 0.82rem;
  pointer-events: none;
  white-space: nowrap;
}
.tt-date {
  color: var(--text-muted);
  margin-bottom: 4px;
}
.tt-row {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text);
}
.swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.tt-summary {
  color: var(--text-secondary);
}
.tt-detail {
  color: var(--text-muted);
  margin-top: 2px;
}
@media (max-width: 640px) {
  .hit {
    padding: 0 0.5px;
  }
}
</style>
