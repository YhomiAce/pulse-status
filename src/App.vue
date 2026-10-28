<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import { brandName } from '@/env';
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink to="/" class="brand">
        <img src="/favicon.svg" alt="" width="24" height="24" />
        <span>{{ brandName }}</span>
      </RouterLink>
      <nav aria-label="Main">
        <RouterLink to="/" class="nav-link" exact-active-class="active">Status</RouterLink>
        <RouterLink to="/admin" class="nav-link" active-class="active">Admin</RouterLink>
      </nav>
    </div>
  </header>
  <main class="container site-main">
    <RouterView />
  </main>
  <footer class="container site-footer muted">
    Monitored by pulse · Times shown in your local time zone; daily bars use UTC days.
  </footer>
</template>

<style scoped>
.site-header {
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 650;
  font-size: 1.1rem;
  color: var(--text);
}
.brand:hover {
  text-decoration: none;
}
nav {
  display: flex;
  gap: 4px;
}
.nav-link {
  color: var(--text-secondary);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.9rem;
}
.nav-link:hover {
  background: var(--surface-muted);
  text-decoration: none;
}
.nav-link.active {
  color: var(--text);
  font-weight: 550;
}
.site-main {
  padding-top: 32px;
  padding-bottom: 48px;
}
.site-footer {
  font-size: 0.8rem;
  padding-bottom: 32px;
  text-align: center;
}
</style>
