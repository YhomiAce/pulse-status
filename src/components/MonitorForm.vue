<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { HTTP_METHODS } from '@/api/schemas';
import {
  INTERVAL_RANGE,
  TIMEOUT_RANGE,
  validateMonitorForm,
  type FieldErrors,
  type MonitorCreateBody,
  type MonitorFormValues,
} from '@/lib/monitor-form';

const props = defineProps<{
  initial: MonitorFormValues;
  submitLabel: string;
  /** Saves the monitor; resolves with field errors from the API, or nothing on success. */
  onSave: (value: MonitorCreateBody) => Promise<FieldErrors | void>;
}>();
const emit = defineEmits<{ cancel: [] }>();

const values = reactive<MonitorFormValues>({ ...props.initial });
const errors = ref<FieldErrors>({});
const submitted = ref(false);
const saving = ref(false);
const idPrefix = `monitor-form-${Math.random().toString(36).slice(2, 8)}`;

// After a first submit attempt, re-validate as the user types.
watch(values, () => {
  if (!submitted.value) return;
  const result = validateMonitorForm(values);
  errors.value = result.ok ? {} : result.errors;
});

async function submit(): Promise<void> {
  submitted.value = true;
  const result = validateMonitorForm(values);
  if (!result.ok) {
    errors.value = result.errors;
    return;
  }
  saving.value = true;
  try {
    errors.value = (await props.onSave(result.value)) ?? {};
  } finally {
    saving.value = false;
  }
}

const id = (field: string) => `${idPrefix}-${field}`;
</script>

<template>
  <form class="monitor-form" novalidate @submit.prevent="submit">
    <p v-if="errors.form" class="alert alert-error" role="alert">{{ errors.form }}</p>
    <div class="grid">
      <div class="field span-2">
        <label :for="id('name')">Name</label>
        <input :id="id('name')" v-model="values.name" type="text" maxlength="120" :aria-invalid="!!errors.name" placeholder="Payments API" />
        <p v-if="errors.name" class="error">{{ errors.name }}</p>
      </div>
      <div class="field span-2">
        <label :for="id('url')">URL</label>
        <input :id="id('url')" v-model="values.url" type="url" :aria-invalid="!!errors.url" placeholder="https://api.example.com/health" />
        <p v-if="errors.url" class="error">{{ errors.url }}</p>
      </div>
      <div class="field">
        <label :for="id('method')">Method</label>
        <select :id="id('method')" v-model="values.method">
          <option v-for="method in HTTP_METHODS" :key="method" :value="method">{{ method }}</option>
        </select>
      </div>
      <div class="field">
        <label :for="id('expectedStatus')">Expected status</label>
        <input :id="id('expectedStatus')" v-model.number="values.expectedStatus" type="number" min="100" max="599" :aria-invalid="!!errors.expectedStatus" />
        <p v-if="errors.expectedStatus" class="error">{{ errors.expectedStatus }}</p>
      </div>
      <div class="field">
        <label :for="id('intervalSeconds')">Interval (seconds)</label>
        <input
          :id="id('intervalSeconds')"
          v-model.number="values.intervalSeconds"
          type="number"
          :min="INTERVAL_RANGE.min"
          :max="INTERVAL_RANGE.max"
          :aria-invalid="!!errors.intervalSeconds"
        />
        <p v-if="errors.intervalSeconds" class="error">{{ errors.intervalSeconds }}</p>
        <p v-else class="hint">{{ INTERVAL_RANGE.min }} to {{ INTERVAL_RANGE.max }}</p>
      </div>
      <div class="field">
        <label :for="id('timeoutMs')">Timeout (ms)</label>
        <input
          :id="id('timeoutMs')"
          v-model.number="values.timeoutMs"
          type="number"
          :min="TIMEOUT_RANGE.min"
          :max="TIMEOUT_RANGE.max"
          :aria-invalid="!!errors.timeoutMs"
        />
        <p v-if="errors.timeoutMs" class="error">{{ errors.timeoutMs }}</p>
        <p v-else class="hint">{{ TIMEOUT_RANGE.min }} to {{ TIMEOUT_RANGE.max }}, shorter than the interval</p>
      </div>
      <label class="check span-2">
        <input v-model="values.enabled" type="checkbox" />
        Enabled (paused monitors are not checked and are hidden from the status page)
      </label>
    </div>
    <div class="actions">
      <button type="button" class="btn" @click="emit('cancel')">Cancel</button>
      <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Saving…' : submitLabel }}</button>
    </div>
  </form>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
}
.span-2 {
  grid-column: span 2;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
label {
  font-size: 0.85rem;
  font-weight: 550;
}
input[type='text'],
input[type='url'],
input[type='number'],
select {
  font: inherit;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
input[aria-invalid='true'] {
  border-color: var(--critical);
}
.error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--critical-text);
}
.hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 400;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}
.alert {
  margin: 0 0 14px;
}
@media (max-width: 560px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: auto;
  }
}
</style>
