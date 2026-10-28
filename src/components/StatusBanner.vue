<script setup lang="ts">
import { computed } from 'vue';
import type { OverallStatus, Service } from '@/api/schemas';
import { formatRelative } from '@/lib/format';
import { bannerFor } from '@/lib/status';

const props = defineProps<{
  status: OverallStatus;
  services: readonly Pick<Service, 'state'>[];
  updatedAt?: string;
}>();

const banner = computed(() => bannerFor(props.status, props.services));
const icon = computed(() => ({ operational: '✓', degraded: '!', major: '✕', unknown: '…' })[banner.value.tone]);
</script>

<template>
  <section class="banner" :class="`tone-${banner.tone}`" role="status" aria-live="polite" data-testid="status-banner">
    <span class="icon" aria-hidden="true">{{ icon }}</span>
    <div class="text">
      <h1 class="title">{{ banner.title }}</h1>
      <p class="detail">{{ banner.detail }}</p>
    </div>
    <p v-if="updatedAt" class="updated">Updated {{ formatRelative(updatedAt) }}</p>
  </section>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--tone) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--tone) 35%, transparent);
}
.icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--tone);
  color: #fff;
  font-weight: 700;
  flex: none;
}
.tone-degraded .icon {
  color: #0b0b0b;
}
.text {
  flex: 1;
  min-width: 0;
}
.title {
  font-size: 1.25rem;
  font-weight: 650;
}
.detail {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
}
.updated {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
}
@media (max-width: 560px) {
  .banner {
    flex-wrap: wrap;
  }
  .updated {
    width: 100%;
  }
}
</style>
