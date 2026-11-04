<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import { useProjectFormStore } from "@/stores/projectForm";
import PageHeader from "@/components/layout/PageHeader.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";

const route = useRoute();
const router = useRouter();
const db = useDbStore();
const ui = useUiStore();
const form = useProjectFormStore();

const isNew = computed(() => route.params.id === "new");
const project = computed(() => db.projects.find((p) => p.id === Number(route.params.id)) || null);
const title = computed(() => (isNew.value ? "פרויקט חדש" : project.value?.name || ""));

/* Demo preview. "תצוגה מרוכזת" folds the page header into the card: the trail
   ends in the project's name instead of repeating it under itself, the tabs sit
   on the gutter the content below already uses, and one rule runs under the lot.
   Each tab then carries its own save. Off by default; not meant to ship. */
const compact = computed({
  get: () => ui.prefs.compactProjectHeader,
  set: (v) => ui.setPref("compactProjectHeader", v),
});
const TRAIL = ["שם-לקוח", "מחלקה", "תת מחלקה"];

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
    <PageHeader v-if="!compact" :title="title">
      <template #actions>
        <button class="btn btn-primary" @click="save">
          {{ activeTab === "general" ? "שמור" : "שמירה" }}
        </button>
        <button class="btn btn-secondary" @click="router.push('/projects')">ביטול</button>
      </template>
    </PageHeader>

    <div class="card" :class="{ compact }">
      <!-- compact: the trail ends in the project's name, so the name is said once -->
      <nav v-if="compact" class="trail">
        <button class="trail-back" title="חזרה לרשימת הפרויקטים" @click="router.push('/projects')">
          <AppIcon name="chevron-right" :size="16" />
        </button>
        <template v-for="c in TRAIL" :key="c">
          <span class="trail-step">{{ c }}</span>
          <AppIcon class="trail-sep" name="chevron-left" :size="12" />
        </template>
        <button class="trail-step link" @click="router.push('/projects')">פרויקטים</button>
        <AppIcon class="trail-sep" name="chevron-left" :size="12" />
        <h1 v-full-title class="trail-current ellipsis">{{ title }}</h1>
      </nav>

      <nav class="tab-row" :class="{ compact }">
        <div class="tabs">
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
        </div>
        <!-- demo-only preview switch, kept quiet at the far end -->
        <label class="density" title="תצוגה לבדיקה: מרוכזת מקפלת את הכותרת העליונה אל תוך הכרטיס">
          <span class="density-label">תצוגה מרוכזת</span>
          <BaseToggle v-model="compact" />
        </label>
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
/* without the page header the card starts at the top of the page and keeps its height */
.card.compact {
  height: calc(100vh - 36px);
}

/* ---------- the trail, which is also the title ---------- */
.trail {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 34px;
  padding: 10px 24px 0;
  flex-shrink: 0;
}
.trail-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: 4px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.trail-back:hover {
  background: var(--surface-subtle);
  color: var(--text-primary);
}
.trail-step {
  font-size: 12px;
  line-height: 16px;
  color: var(--text-muted);
  white-space: nowrap;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
}
.trail-step.link {
  color: var(--text-secondary);
  cursor: pointer;
}
.trail-step.link:hover {
  color: var(--brand-primary);
  text-decoration: underline;
}
.trail-sep {
  color: var(--text-disabled);
  flex-shrink: 0;
  margin: 0 2px;
}
.trail-current {
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 20px;
  color: var(--text-primary);
  text-align: right;
}

/* ---------- tabs: one gutter, one rule ---------- */
.tab-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 0;
  flex-shrink: 0;
}
.tab-row.compact {
  padding: 6px 24px 0;
  /* a single hairline under the whole row — the active tab's accent sits on it */
  border-bottom: 1px solid var(--divider);
}
.tabs {
  display: flex;
  align-items: flex-end;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar {
  display: none;
}
.tab {
  background: none;
  border: none;
  border-bottom: 2px solid var(--divider);
  padding: 8px 24px;
  font-size: 14px;
  color: var(--text-secondary);
  font-family: inherit;
  white-space: nowrap;
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
/* compact: the row owns the rule, so a tab only draws its own accent */
.tab-row.compact .tab {
  border-bottom-color: transparent;
  margin-bottom: -1px;
  padding: 9px 18px;
}
.tab-row.compact .tab:hover:not(.disabled):not(.active) {
  color: var(--text-primary);
}
.tab-row.compact .tab.active {
  border-bottom-color: var(--brand-primary);
}
.tab-row:not(.compact) .tabs {
  flex: 1;
}
/* classic keeps its filler rule to the end of the row */
.tab-row:not(.compact)::after {
  content: "";
  flex: 1;
  align-self: stretch;
  border-bottom: 2px solid var(--divider);
  order: 1;
}
.density {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-bottom: 8px;
  cursor: pointer;
  order: 2;
}
.tab-row.compact .density {
  padding-bottom: 6px;
}
.density-label {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}
.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
