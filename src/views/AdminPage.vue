<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { ApiError, type Monitor } from '@/api';
import MonitorForm from '@/components/MonitorForm.vue';
import StateBadge from '@/components/StateBadge.vue';
import { formatPercent } from '@/lib/format';
import {
  apiIssuesToErrors,
  changedFields,
  emptyMonitorForm,
  monitorToForm,
  type FieldErrors,
  type MonitorCreateBody,
} from '@/lib/monitor-form';
import { useAdminStore } from '@/stores/admin';
import { useStatusStore } from '@/stores/status';

const admin = useAdminStore();
const statusStore = useStatusStore();

const tokenInput = ref('');
const tokenError = ref<string | null>(null);
/** `'new'` while creating, a monitor id while editing, `null` otherwise. */
const editing = ref<'new' | number | null>(null);
const confirmingDelete = ref<number | null>(null);
const deleting = ref(false);
const notice = ref<string | null>(null);
const actionError = ref<string | null>(null);

const editedMonitor = computed(() =>
  typeof editing.value === 'number' ? admin.monitors.find((monitor) => monitor.id === editing.value) ?? null : null,
);

watch(
  () => admin.signedIn,
  (signedIn) => {
    if (signedIn) void admin.loadMonitors();
    else editing.value = null;
  },
  { immediate: true },
);

function signIn(): void {
  if (tokenInput.value.trim().length < 16) {
    tokenError.value = 'The admin token is at least 16 characters long.';
    return;
  }
  tokenError.value = null;
  admin.signIn(tokenInput.value);
  tokenInput.value = '';
  admin.error = null;
}

function toFieldErrors(cause: unknown): FieldErrors {
  if (cause instanceof ApiError) {
    if (cause.status === 401) return { form: 'The admin token was rejected. Enter it again.' };
    const fromIssues = apiIssuesToErrors(cause.issues);
    return Object.keys(fromIssues).length > 0 ? fromIssues : { form: cause.message };
  }
  return { form: 'Something went wrong. Try again.' };
}

function flash(message: string): void {
  notice.value = message;
  actionError.value = null;
  setTimeout(() => {
    if (notice.value === message) notice.value = null;
  }, 4000);
  // The public page should reflect the change on its next view.
  void statusStore.refresh();
}

async function create(value: MonitorCreateBody): Promise<FieldErrors | void> {
  try {
    const created = await admin.createMonitor(value);
    editing.value = null;
    flash(`Created “${created.name}”. Its first check runs within a few seconds.`);
  } catch (cause) {
    return toFieldErrors(cause);
  }
}

async function update(monitor: Monitor, value: MonitorCreateBody): Promise<FieldErrors | void> {
  const changes = changedFields(monitor, value);
  if (Object.keys(changes).length === 0) {
    editing.value = null;
    return;
  }
  try {
    const updated = await admin.updateMonitor(monitor.id, changes);
    editing.value = null;
    flash(`Saved “${updated.name}”.`);
  } catch (cause) {
    return toFieldErrors(cause);
  }
}

async function remove(monitor: Monitor): Promise<void> {
  deleting.value = true;
  try {
    await admin.deleteMonitor(monitor.id);
    confirmingDelete.value = null;
    flash(`Deleted “${monitor.name}”.`);
  } catch (cause) {
    actionError.value = cause instanceof ApiError ? cause.message : 'Could not delete the monitor.';
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="admin">
    <div class="title-row">
      <h1>Admin</h1>
      <button v-if="admin.signedIn" class="btn" @click="admin.signOut()">Sign out</button>
    </div>

    <section v-if="!admin.signedIn" class="card signin">
      <h2>Enter the admin token</h2>
      <p class="muted">
        This is pulse's <code>ADMIN_TOKEN</code>. It is kept in this tab's session storage only, and is checked by the
        API when you save a change.
      </p>
      <p v-if="admin.error" class="alert alert-error" role="alert">{{ admin.error }}</p>
      <form class="signin-form" @submit.prevent="signIn">
        <label for="admin-token" class="sr-only">Admin token</label>
        <input id="admin-token" v-model="tokenInput" type="password" autocomplete="off" placeholder="Admin token" :aria-invalid="!!tokenError" />
        <button type="submit" class="btn btn-primary">Continue</button>
      </form>
      <p v-if="tokenError" class="error">{{ tokenError }}</p>
    </section>

    <template v-else>
      <p v-if="notice" class="alert notice" role="status">{{ notice }}</p>
      <p v-if="actionError || admin.error" class="alert alert-error" role="alert">{{ actionError ?? admin.error }}</p>

      <section v-if="editing === 'new'" class="card form-card">
        <h2>New monitor</h2>
        <MonitorForm :initial="emptyMonitorForm()" submit-label="Create monitor" :on-save="create" @cancel="editing = null" />
      </section>
      <section v-else-if="editedMonitor" class="card form-card">
        <h2>Edit {{ editedMonitor.name }}</h2>
        <MonitorForm
          :key="editedMonitor.id"
          :initial="monitorToForm(editedMonitor)"
          submit-label="Save changes"
          :on-save="(value) => update(editedMonitor!, value)"
          @cancel="editing = null"
        />
      </section>

      <div class="list-head">
        <h2 class="section-title">Monitors</h2>
        <button v-if="editing === null" class="btn btn-primary" @click="editing = 'new'">+ New monitor</button>
      </div>

      <div class="card">
        <p v-if="admin.loading && admin.monitors.length === 0" class="empty muted">Loading monitors…</p>
        <p v-else-if="admin.monitors.length === 0" class="empty muted">No monitors yet. Create the first one.</p>
        <table v-else class="monitors">
          <thead>
            <tr>
              <th>Name</th>
              <th>State</th>
              <th class="num">Interval</th>
              <th class="num">24h</th>
              <th><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="monitor in admin.monitors" :key="monitor.id">
              <td class="name-cell">
                <RouterLink :to="{ name: 'service', params: { id: monitor.id } }" class="name">{{ monitor.name }}</RouterLink>
                <span class="url muted">{{ monitor.method }} {{ monitor.url }} → {{ monitor.expectedStatus }}</span>
              </td>
              <td><StateBadge :state="monitor.state" :enabled="monitor.enabled" /></td>
              <td class="num">{{ monitor.intervalSeconds }}s</td>
              <td class="num">{{ formatPercent(monitor.uptime?.['24h'] ?? null) }}</td>
              <td class="actions">
                <template v-if="confirmingDelete === monitor.id">
                  <span class="confirm">Delete with its history?</span>
                  <button class="btn" :disabled="deleting" @click="confirmingDelete = null">Cancel</button>
                  <button class="btn btn-danger" :disabled="deleting" @click="remove(monitor)">Delete</button>
                </template>
                <template v-else>
                  <button class="btn" :aria-label="`Edit ${monitor.name}`" @click="editing = monitor.id">Edit</button>
                  <button class="btn btn-danger" :aria-label="`Delete ${monitor.name}`" @click="confirmingDelete = monitor.id">Delete</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.title-row h1 {
  font-size: 1.6rem;
}
.signin {
  padding: 28px;
  max-width: 520px;
}
.signin h2,
.form-card h2 {
  font-size: 1.1rem;
  margin-bottom: 8px;
}
.signin-form {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.signin-form input {
  flex: 1;
  font: inherit;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
.error {
  color: var(--critical-text);
  font-size: 0.85rem;
  margin: 8px 0 0;
}
.form-card {
  padding: 24px;
  margin-bottom: 8px;
}
.notice {
  border-color: color-mix(in srgb, var(--good) 40%, transparent);
  background: color-mix(in srgb, var(--good) 8%, var(--surface));
}
.alert {
  margin: 0 0 16px;
}
.list-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.empty {
  padding: 20px 24px;
  margin: 0;
}
.monitors {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 12px 16px;
  text-align: left;
  vertical-align: middle;
}
th {
  font-size: 0.75rem;
  font-weight: 550;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}
tbody tr + tr td {
  border-top: 1px solid var(--border);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.name-cell {
  max-width: 320px;
}
.name {
  font-weight: 600;
  color: var(--text);
  display: block;
}
.url {
  display: block;
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions {
  text-align: right;
  white-space: nowrap;
}
.actions .btn {
  padding: 4px 10px;
  margin-left: 6px;
}
.confirm {
  font-size: 0.82rem;
  color: var(--text-secondary);
}
@media (max-width: 640px) {
  th:nth-child(3),
  td:nth-child(3),
  th:nth-child(4),
  td:nth-child(4) {
    display: none;
  }
  .actions {
    white-space: normal;
  }
}
</style>
