<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="card not-found">
    <h1>Page not found</h1>
    <p class="muted">The page you are looking for does not exist.</p>
    <RouterLink to="/" class="btn">Back to the status page</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  padding: 48px 24px;
  text-align: center;
}
.btn:hover {
  text-decoration: none;
}
</style>
