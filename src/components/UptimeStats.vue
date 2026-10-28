<script setup lang="ts">
import type { UptimeSummary } from '@/api/schemas';
import { formatPercent } from '@/lib/format';

defineProps<{ uptime: UptimeSummary }>();
const windows = ['24h', '7d', '30d'] as const;
</script>

<template>
  <dl class="uptime-stats">
    <div v-for="window in windows" :key="window" class="stat">
      <dt>{{ window }}</dt>
      <dd>{{ formatPercent(uptime[window]) }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.uptime-stats {
  display: flex;
  gap: 18px;
  margin: 0;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
dt {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
dd {
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
}
</style>
