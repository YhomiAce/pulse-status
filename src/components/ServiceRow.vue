<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { Service } from '@/api/schemas';
import StateBadge from './StateBadge.vue';
import UptimeBars from './UptimeBars.vue';
import UptimeStats from './UptimeStats.vue';

defineProps<{ service: Service }>();
</script>

<template>
  <article class="service-row">
    <div class="head">
      <RouterLink :to="{ name: 'service', params: { id: service.id } }" class="name">{{ service.name }}</RouterLink>
      <StateBadge :state="service.state" />
    </div>
    <UptimeBars :days="service.days" :label="service.name" />
    <div class="foot">
      <span class="muted latency">
        <template v-if="service.lastLatencyMs !== null">Last response {{ service.lastLatencyMs }} ms</template>
        <template v-else>No checks yet</template>
      </span>
      <UptimeStats :uptime="service.uptime" />
    </div>
  </article>
</template>

<style scoped>
.service-row {
  padding: 20px 24px;
}
.service-row + .service-row {
  border-top: 1px solid var(--border);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.name {
  font-weight: 600;
  color: var(--text);
}
.foot {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.latency {
  font-size: 0.82rem;
}
</style>
