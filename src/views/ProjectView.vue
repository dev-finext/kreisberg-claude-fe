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

/* Demo preview: "מרוכזת" drops the page header and moves the project's identity
   down onto the tab strip, so the screen keeps the ~70px the header was using.
   Each tab then carries its own save; the toggle is here so the two layouts can
   be compared side by side, and it is not meant to ship. */
const compact = computed({
  get: () => ui.prefs.compactProjectHeader,
  set: (v) => ui.setPref("compactProjectHeader", v),
});
const CRUMBS = ["שם-לקוח", "מחלקה", "תת מחלקה", "פרויקטים"];

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
      <nav class="tab-strip" :class="{ compact }">
        <!-- compact: the project's name and trail live on the strip -->
        <div v-if="compact" class="strip-side identity">
          <div class="crumbs">
            <template v-for="(c, i) in CRUMBS" :key="i">
              <span class="crumb">{{ c }}</span>
              <span class="crumb-sep"><AppIcon name="chevron-left" :size="12" /></span>
            </template>
            <span class="crumb crumb-current">{{ title }}</span>
          </div>
          <h1 v-full-title class="strip-title ellipsis">{{ title }}</h1>
        </div>

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

        <div v-if="!compact" class="tab-filler" />

        <!-- demo-only preview switch -->
        <div class="strip-side density">
          <label
            class="density-switch"
            title="תצוגה לבדיקה: מרוכזת מסירה את הכותרת העליונה ומעבירה את שם הפרויקט לשורת הלשוניות"
          >
            <span class="density-label">תצוגה מרוכזת</span>
            <BaseToggle v-model="compact" />
          </label>
        </div>
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
.tab-strip {
  display: flex;
  align-items: flex-end;
  padding: 20px 24px 0;
}
/* three columns: identity on the right, tabs dead centre, the switch on the left */
.tab-strip.compact {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  padding: 10px 24px 0;
}
.tabs {
  display: flex;
  align-items: flex-end;
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
.tab-filler {
  flex: 1;
  border-bottom: 2px solid var(--divider);
  align-self: stretch;
}
/* the strip's two edges carry the same rule the tabs sit on */
.strip-side {
  display: flex;
  align-items: flex-end;
  min-width: 0;
  border-bottom: 2px solid var(--divider);
  padding-bottom: 6px;
}
.identity {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  justify-content: flex-end;
}
.crumbs {
  display: flex;
  align-items: center;
  font-size: 11px;
  line-height: 14px;
  color: var(--text-secondary);
}
.crumb-sep {
  display: inline-flex;
  margin: 0 1px;
}
.crumb-current {
  font-weight: 700;
  color: var(--text-primary);
}
.strip-title {
  max-width: 100%;
  font-size: 17px;
  font-weight: 700;
  line-height: 22px;
  color: var(--text-primary);
  text-align: right;
}
.density {
  justify-content: flex-end;
}
.tab-strip:not(.compact) .density {
  padding-bottom: 8px;
}
.density-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.density-label {
  font-size: 12px;
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
