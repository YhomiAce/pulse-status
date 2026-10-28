<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { api, ApiError, type Incident, type Monitor, type Range, type ResponseTimes } from '@/api';
import { RANGES } from '@/api/schemas';
import IncidentTimeline from '@/components/IncidentTimeline.vue';
import ResponseTimeChart from '@/components/ResponseTimeChart.vue';
import StateBadge from '@/components/StateBadge.vue';
import UptimeBars from '@/components/UptimeBars.vue';
import UptimeStats from '@/components/UptimeStats.vue';
import { formatRelative } from '@/lib/format';
import { setPageTitle } from '@/router';
import { useStatusStore } from '@/stores/status';

const props = defineProps<{ id: number }>();
const route = useRoute();
const router = useRouter();
const statusStore = useStatusStore();

const monitor = shallowRef<Monitor | null>(null);
const incidents = shallowRef<Incident[]>([]);
const series = shallowRef<ResponseTimes | null>(null);
const error = ref<string | null>(null);
const notFound = ref(false);
const seriesLoading = ref(false);
const seriesError = ref<string | null>(null);

const rangeLabels: Record<Range, string> = { '24h': '24 hours', '7d': '7 days', '30d': '30 days' };
const range = computed<Range>(() => {
  const value = route.query.range;
  return RANGES.find((item) => item === value) ?? '24h';
});
const days = computed(() => statusStore.services.find((service) => service.id === props.id)?.days ?? null);

let controller: AbortController | null = null;
let seriesController: AbortController | null = null;

async function loadMonitor(): Promise<void> {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  error.value = null;
  notFound.value = false;
  try {
    const [loaded, history] = await Promise.all([
      api.getMonitor(props.id, current.signal),
      api.getMonitorIncidents(props.id, 50, current.signal),
    ]);
    monitor.value = loaded;
    incidents.value = history;
    setPageTitle(loaded.name);
  } catch (cause) {
    if (current.signal.aborted) return;
    if (cause instanceof ApiError && cause.status === 404) {
      notFound.value = true;
      setPageTitle('Service not found');
    } else {
      error.value = cause instanceof ApiError ? cause.message : 'Could not load this service.';
    }
  }
}

async function loadSeries(): Promise<void> {
  seriesController?.abort();
  const current = new AbortController();
  seriesController = current;
  seriesLoading.value = true;
  seriesError.value = null;
  try {
    series.value = await api.getResponseTimes(props.id, range.value, current.signal);
  } catch (cause) {
    if (current.signal.aborted) return;
    seriesError.value = cause instanceof ApiError ? cause.message : 'Could not load response times.';
  } finally {
    if (seriesController === current) seriesLoading.value = false;
  }
}

function selectRange(value: Range): void {
  void router.replace({ query: { ...route.query, range: value === '24h' ? undefined : value } });
}

watch(
  () => props.id,
  () => {
    monitor.value = null;
    void loadMonitor();
    if (!statusStore.data) void statusStore.refresh();
  },
  { immediate: true },
);
watch([() => props.id, range], () => void loadSeries(), { immediate: true });

onUnmounted(() => {
  controller?.abort();
  seriesController?.abort();
});
</script>

<template>
  <div class="service-detail">
    <RouterLink to="/" class="back">← All services</RouterLink>

    <div v-if="notFound" class="card notice">
      <h1>Service not found</h1>
      <p class="muted">There is no service with id {{ id }}. It may have been removed.</p>
    </div>
    <p v-else-if="error" class="alert alert-error" role="alert">
      {{ error }} <button class="btn" @click="loadMonitor()">Retry</button>
    </p>

    <template v-if="monitor">
      <header class="head">
        <div>
          <h1>{{ monitor.name }}</h1>
          <p class="muted sub">
            {{ monitor.method }} {{ monitor.url }} · every {{ monitor.intervalSeconds }}s
            <template v-if="monitor.lastCheckedAt"> · checked {{ formatRelative(monitor.lastCheckedAt) }}</template>
          </p>
        </div>
        <StateBadge :state="monitor.state" :enabled="monitor.enabled" />
      </header>

      <div class="card panel">
        <div class="panel-head">
          <h2 class="panel-title">Uptime</h2>
          <UptimeStats v-if="monitor.uptime" :uptime="monitor.uptime" />
        </div>
        <UptimeBars v-if="days" :days="days" :label="monitor.name" />
        <p v-else class="muted small">Daily bars are shown for enabled services.</p>
      </div>

      <div class="card panel">
        <div class="panel-head">
          <h2 class="panel-title">Response time</h2>
          <div class="ranges" role="group" aria-label="Range">
            <button
              v-for="item in RANGES"
              :key="item"
              type="button"
              class="range"
              :class="{ active: item === range }"
              :aria-pressed="item === range"
              @click="selectRange(item)"
            >
              {{ item }}
            </button>
          </div>
        </div>
        <p class="muted small">Average response time of successful checks over the last {{ rangeLabels[range] }}.</p>
        <p v-if="seriesError" class="alert alert-error">{{ seriesError }}</p>
        <div :class="{ dim: seriesLoading }">
          <ResponseTimeChart v-if="series" :series="series" />
        </div>
      </div>

      <h2 class="section-title">Incident history</h2>
      <IncidentTimeline :incidents="incidents" empty-text="No incidents recorded for this service." />
    </template>
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 20px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}
.head h1 {
  font-size: 1.6rem;
}
.sub {
  margin: 4px 0 0;
  font-size: 0.88rem;
  overflow-wrap: anywhere;
}
.panel {
  padding: 20px 24px;
  margin-bottom: 16px;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.panel-title {
  font-size: 1rem;
  font-weight: 600;
}
.small {
  font-size: 0.85rem;
  margin: 0 0 12px;
}
.ranges {
  display: inline-flex;
  padding: 3px;
  border-radius: 8px;
  background: var(--surface-muted);
}
.range {
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 0.82rem;
  color: var(--text-secondary);
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.range.active {
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
.dim {
  opacity: 0.6;
  transition: opacity 0.15s;
}
.notice {
  padding: 32px;
  text-align: center;
}
.notice p {
  margin-bottom: 0;
}
.alert {
  margin-bottom: 16px;
}
</style>
