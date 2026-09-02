<script setup>
import AppRail from "@/components/layout/AppRail.vue";
import ToastHost from "@/components/shared/ToastHost.vue";
</script>

<template>
  <div class="app-layout">
    <main class="app-main">
      <router-view />
    </main>
    <AppRail />
    <ToastHost />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--page-bg);
}
.app-main {
  margin-right: var(--rail-w);
  min-height: 100vh;
  padding: 16px 20px 20px;
}
</style>
