<script setup>
import { computed } from "vue";
import AppRail from "@/components/layout/AppRail.vue";
import ToastHost from "@/components/shared/ToastHost.vue";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
const mainStyle = computed(() => ({ marginRight: ui.railExpanded ? "230px" : "var(--rail-w)" }));
</script>

<template>
  <div class="app-layout">
    <main class="app-main" :style="mainStyle">
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
  min-height: 100vh;
  padding: 16px 20px 20px;
  transition: margin-right 0.18s ease;
}
</style>
