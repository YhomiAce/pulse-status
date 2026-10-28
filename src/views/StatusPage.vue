<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import IncidentTimeline from '@/components/IncidentTimeline.vue';
import ServiceRow from '@/components/ServiceRow.vue';
import StatusBanner from '@/components/StatusBanner.vue';
import { useStatusStore } from '@/stores/status';
import { UPTIME_LEVEL_LABELS, type UptimeLevel } from '@/lib/uptime';

const store = useStatusStore();
const legend: UptimeLevel[] = ['operational', 'minor', 'partial', 'major', 'none'];

let stop: (() => void) | null = null;
onMounted(() => {
  stop = store.startAutoRefresh();
});
onUnmounted(() => stop?.());
</script>

<template>
  <div class="status-page">
    <p v-if="store.error" class="alert alert-error" role="alert">
      {{ store.error }}
      <template v-if="store.data"> Showing data from {{ store.lastFetchedAt?.toLocaleTimeString() }}.</template>
      <button class="btn retry" @click="store.refresh()">Retry</button>
    </p>

    <template v-if="store.data">
      <StatusBanner :status="store.data.status" :services="store.services" :updated-at="store.data.updatedAt" />

      <div class="services-head">
        <h2 class="section-title">Services</h2>
        <ul class="legend" aria-label="Uptime bar colours">
          <li v-for="level in legend" :key="level"><span class="swatch" :class="`level-${level}`" />{{ UPTIME_LEVEL_LABELS[level] }}</li>
        </ul>
      </div>
      <div v-if="store.services.length > 0" class="card">
        <ServiceRow v-for="service in store.services" :key="service.id" :service="service" />
      </div>
      <p v-else class="card empty muted">No services are being monitored yet.</p>

      <h2 class="section-title">Recent incidents</h2>
      <IncidentTimeline :incidents="store.incidents" show-service empty-text="No incidents in the last 30 days." />
    </template>

    <div v-else-if="!store.error" class="skeleton" aria-busy="true" aria-label="Loading status">
      <div class="sk sk-banner" />
      <div class="sk sk-row" />
      <div class="sk sk-row" />
      <div class="sk sk-row" />
    </div>
  </div>
</template>

<style scoped>
.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 16px;
}
.retry {
  margin-left: auto;
  padding: 4px 10px;
}
.services-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.legend li {
  display: flex;
  align-items: center;
  gap: 5px;
}
.swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.level-operational { background: var(--good); }
.level-minor { background: var(--warning); }
.level-partial { background: var(--serious); }
.level-major { background: var(--critical); }
.level-none { background: var(--none); }
.empty {
  padding: 20px 24px;
  margin: 0;
}
.skeleton {
  display: grid;
  gap: 16px;
}
.sk {
  border-radius: var(--radius);
  background: var(--surface-muted);
  animation: pulse 1.4s ease-in-out infinite;
}
.sk-banner { height: 80px; }
.sk-row { height: 110px; }
@keyframes pulse {
  50% { opacity: 0.5; }
}
</style>
