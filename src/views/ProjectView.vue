<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import PageHeader from "@/components/layout/PageHeader.vue";

const route = useRoute();
const router = useRouter();
const db = useDbStore();
const ui = useUiStore();

const isNew = computed(() => route.params.id === "new");
const project = computed(() => db.projects.find((p) => p.id === Number(route.params.id)) || null);
const title = computed(() => (isNew.value ? "פרויקט חדש" : project.value?.name || ""));

const tabs = [
  { id: "general", label: "כללי", enabled: true },
  { id: "conditions", label: "תנאים מיוחדים", enabled: false },
  { id: "resources", label: "משאבים", enabled: false },
  { id: "documents", label: "מסמכים", enabled: false },
  { id: "quantities", label: "כתבי כמויות", enabled: true },
  { id: "quotes", label: "הצעות מחיר", enabled: false },
];

const activeTab = computed(() => {
  const seg = route.path.split("/")[3] || "general";
  return seg;
});

function goTab(tab) {
  if (!tab.enabled) return;
  if (isNew.value && tab.id !== "general") {
    ui.toast("יש לשמור את פרטי הפרויקט לפני מעבר ללשוניות אחרות", "warning");
    return;
  }
  router.push(`/projects/${route.params.id}/${tab.id}`);
}

function save() {
  ui.toast(isNew.value ? "הפרויקט נוצר בהצלחה!" : "הפרויקט עודכן בהצלחה!");
}
</script>

<template>
  <div>
    <PageHeader :title="title">
      <template #actions>
        <button class="btn btn-primary" @click="save">שמירה</button>
        <button class="btn btn-secondary" @click="router.push('/projects')">ביטול</button>
      </template>
    </PageHeader>

    <div class="card">
      <nav class="tab-strip">
        <button
          v-for="t in tabs"
          :key="t.id"
          class="tab"
          :class="{ active: activeTab === t.id, disabled: !t.enabled }"
          :title="t.enabled ? '' : 'לא זמין בדמו'"
          @click="goTab(t)"
        >
          {{ t.label }}
        </button>
        <div class="tab-filler" />
      </nav>
      <div class="tab-content">
        <router-view :project="project" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--surface);
  border-radius: var(--radius-card);
  min-height: calc(100vh - 128px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tab-strip {
  display: flex;
  align-items: flex-end;
  padding: 20px 24px 0;
}
.tab {
  background: none;
  border: none;
  border-bottom: 2px solid var(--divider);
  padding: 8px 24px;
  font-size: 14px;
  color: var(--text-secondary);
  font-family: inherit;
}
.tab.active {
  color: var(--brand-primary);
  font-weight: 500;
  border-bottom-color: var(--brand-primary);
}
.tab.disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}
.tab-filler {
  flex: 1;
  border-bottom: 2px solid var(--divider);
  align-self: stretch;
}
.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
