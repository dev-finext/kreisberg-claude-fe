<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import { useProjectFormStore } from "@/stores/projectForm";
import PageHeader from "@/components/layout/PageHeader.vue";

const route = useRoute();
const router = useRouter();
const db = useDbStore();
const ui = useUiStore();
const form = useProjectFormStore();

const isNew = computed(() => route.params.id === "new");
const project = computed(() => db.projects.find((p) => p.id === Number(route.params.id)) || null);
const title = computed(() => (isNew.value ? "פרויקט חדש" : project.value?.name || ""));

const tabs = [
  { id: "general", label: "כללי", enabled: true },
  { id: "conditions", label: "תנאים מיוחדים", enabled: true },
  { id: "resources", label: "משאבים", enabled: true },
  { id: "documents", label: "מסמכים", enabled: true },
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
  if (activeTab.value === "general" || isNew.value) {
    const res = form.save();
    if (res.error) {
      ui.toast(res.error, "warning");
      return;
    }
    ui.toast(res.created ? "הפרויקט נוצר בהצלחה!" : "הפרויקט עודכן בהצלחה!");
    if (res.created) router.replace(`/projects/${res.id}/general`);
  } else {
    ui.toast("השינויים נשמרו");
  }
}
</script>

<template>
  <div>
    <PageHeader :title="title">
      <template #actions>
        <button class="btn btn-primary" @click="save">
          {{ activeTab === "general" ? "שמור" : "שמירה" }}
        </button>
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
  /* bounded to the viewport so tab content (BOQ editor sidebar) scrolls internally */
  height: calc(100vh - 108px);
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
  overflow: hidden;
}
</style>
