<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { Incident } from '@/api/schemas';
import { formatDateTime, formatDuration } from '@/lib/format';

const props = defineProps<{
  incidents: readonly Incident[];
  /** Show which service each incident belongs to (off on a service's own page). */
  showService?: boolean;
  emptyText?: string;
}>();

const items = computed(() =>
  props.incidents.map((incident) => {
    const ongoing = incident.resolvedAt === null;
    const seconds = incident.durationSeconds ?? (Date.now() - new Date(incident.startedAt).getTime()) / 1000;
    return { incident, ongoing, duration: formatDuration(seconds) };
  }),
);
</script>

<template>
  <div class="timeline card">
    <p v-if="items.length === 0" class="empty muted">{{ emptyText ?? 'No incidents reported.' }}</p>
    <ol v-else>
      <li v-for="{ incident, ongoing, duration } in items" :key="incident.id" :class="{ ongoing }">
        <span class="marker" aria-hidden="true" />
        <div class="body">
          <div class="top">
            <span class="pill" :class="ongoing ? 'pill-ongoing' : 'pill-resolved'">{{ ongoing ? 'Ongoing' : 'Resolved' }}</span>
            <RouterLink v-if="showService" :to="{ name: 'service', params: { id: incident.monitorId } }" class="service">
              {{ incident.monitorName }}
            </RouterLink>
          </div>
          <p class="cause">{{ incident.cause }}</p>
          <p class="meta muted">
            Started {{ formatDateTime(incident.startedAt) }}
            <template v-if="incident.resolvedAt"> · resolved {{ formatDateTime(incident.resolvedAt) }}</template>
            · {{ ongoing ? `down for ${duration}` : `lasted ${duration}` }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.timeline {
  padding: 8px 24px;
}
.empty {
  margin: 12px 0;
}
ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  position: relative;
  display: flex;
  gap: 14px;
  padding: 14px 0;
}
li + li {
  border-top: 1px solid var(--border);
}
.marker {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--good);
  flex: none;
}
.ongoing .marker {
  background: var(--critical);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--critical) 20%, transparent);
}
.body {
  min-width: 0;
}
.top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.pill-ongoing {
  color: var(--critical-text);
  background: color-mix(in srgb, var(--critical) 12%, transparent);
}
.pill-resolved {
  color: var(--good-text);
  background: color-mix(in srgb, var(--good) 12%, transparent);
}
.service {
  font-weight: 600;
  color: var(--text);
}
.cause {
  margin: 4px 0 2px;
  overflow-wrap: anywhere;
}
.meta {
  margin: 0;
  font-size: 0.82rem;
}
</style>
