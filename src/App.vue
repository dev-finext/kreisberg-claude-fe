<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppRail from "@/components/layout/AppRail.vue";
import ToastHost from "@/components/shared/ToastHost.vue";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
const route = useRoute();
const mainStyle = computed(() => ({ marginRight: ui.prefs.railExpanded ? "240px" : "var(--rail-w)" }));
</script>

<template>
  <!-- a bare route (the print page) is the document alone -->
  <template v-if="route.meta.bare">
    <router-view />
    <ToastHost />
  </template>
  <div v-else class="app-layout">
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
