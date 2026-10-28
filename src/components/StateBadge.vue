<script setup lang="ts">
import { computed } from 'vue';
import type { MonitorState } from '@/api/schemas';
import { stateInfo } from '@/lib/status';

// Boolean props default to false in Vue, so default `enabled` explicitly.
const props = withDefaults(defineProps<{ state: MonitorState; enabled?: boolean }>(), { enabled: true });
const info = computed(() =>
  !props.enabled ? { tone: 'unknown' as const, label: 'Paused' } : stateInfo(props.state),
);
</script>

<template>
  <span class="badge" :class="`tone-${info.tone}`">
    <span class="dot" :class="`tone-${info.tone}`" aria-hidden="true" />
    {{ info.label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 550;
  color: var(--text-secondary);
  white-space: nowrap;
}
.tone-operational.badge {
  color: var(--good-text);
}
.tone-major.badge {
  color: var(--critical-text);
}
</style>
