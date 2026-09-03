<script setup>
import { ref, computed, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import PageHeader from "@/components/layout/PageHeader.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import SearchPill from "@/components/shared/SearchPill.vue";
import ContextMenu from "@/components/shared/ContextMenu.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";

const route = useRoute();
const router = useRouter();
const db = useDbStore();
const ui = useUiStore();

const SUGGESTIONS = [
  "מס' פריט",
  "תאור",
  "יח'",
  "כמות חוזה",
  "מחיר",
  'סה"כ',
  "הערות",
  "חובה",
  "עדיפות",
  "לסיכום",
];

const importFile = computed(() => route.query.import || "");
const importProjectId = computed(() => (route.query.project ? Number(route.query.project) : null));

const selectedId = ref(db.mappings[0]?.id ?? null);
const mapping = computed(() => db.mappings.find((m) => m.id === selectedId.value) || null);
const search = ref("");
const renaming = ref(false);
const nameDraft = ref("");
const nameInput = ref(null);
const menu = ref(null);
const deleteTarget = ref(null);

const fields = computed(() => {
  const t = search.value.trim();
  return db.mappingSystemFields.filter((f) => !t || f.label.includes(t));
});
const requiredFilled = computed(
  () =>
    !!mapping.value &&
    db.mappingSystemFields.filter((f) => f.required).every((f) => (mapping.value.columns[f.key] || "").trim())
);

function setColumn(key, value) {
  mapping.value.columns[key] = value;
  db.persist();
}
function createMapping() {
  const m = {
    id: db.nextId("mappings"),
    name: `מיפוי ${db.mappings.length + 1}`,
    active: true,
    columns: Object.fromEntries(db.mappingSystemFields.map((f) => [f.key, ""])),
  };
  db.db.mappings.push(m);
  db.persist();
  selectedId.value = m.id;
  ui.toast("נוצר סוג מיפוי חדש");
  startRename();
}
function startRename() {
  if (!mapping.value) return;
  nameDraft.value = mapping.value.name;
  renaming.value = true;
  nextTick(() => nameInput.value?.focus());
}
function commitRename() {
  if (nameDraft.value.trim()) mapping.value.name = nameDraft.value.trim();
  db.persist();
  renaming.value = false;
}
function openMenu(m, e) {
  const rect = e.currentTarget.getBoundingClientRect();
  menu.value = { mapping: m, x: rect.left - 150, y: rect.bottom + 4 };
}
function onMenu(key) {
  const m = menu.value.mapping;
  menu.value = null;
  if (key === "rename") {
    selectedId.value = m.id;
    startRename();
  } else if (key === "delete") deleteTarget.value = m;
}
function confirmDelete() {
  db.db.mappings = db.db.mappings.filter((m) => m.id !== deleteTarget.value.id);
  if (selectedId.value === deleteTarget.value.id) selectedId.value = db.mappings[0]?.id ?? null;
  db.persist();
  deleteTarget.value = null;
  ui.toast("סוג המיפוי נמחק");
}
function save() {
  db.persist();
  ui.toast("המיפוי נשמר");
}

/* ---------- import completion: create a BOQ from the mapped file ---------- */
function finishImport() {
  if (!requiredFilled.value || !importProjectId.value) return;
  const today = new Date().toISOString().slice(0, 10);
  const boq = {
    id: db.nextId("boqHeaders"),
    projectId: importProjectId.value,
    name: String(importFile.value).replace(/\.[^.]+$/, ""),
    isSource: !db.boqHeaders.some((h) => h.projectId === importProjectId.value),
    detail: `יובא מקובץ ${importFile.value} (מיפוי: ${mapping.value.name})`,
    docName: mapping.value.name,
    catalogId: 3,
    classification: "spec",
    status: "draft",
    stagePills: [],
    resourceTypeId: 1,
    resourceId: null,
    exitDate: "",
    sla: { late: 0, near: 0, ok: 0 },
    notes: "",
    createdAt: today,
  };
  db.db.boqHeaders.push(boq);
  const elA = {
    id: db.nextId("structureElements"),
    boqId: boq.id,
    parentId: null,
    name: "קומת כניסה",
    description: "",
    visible: true,
    inBudget: true,
  };
  db.db.structureElements.push(elA);
  const elB = {
    id: db.nextId("structureElements"),
    boqId: boq.id,
    parentId: null,
    name: "חדרים רטובים",
    description: "",
    visible: true,
    inBudget: true,
  };
  db.db.structureElements.push(elB);
  const items = db.allItems.filter((i) => !i.isNote && i.type === "regular").slice(0, 60);
  const pick = [items[3], items[7], items[11], items[15], items[19], items[23]].filter(Boolean);
  pick.forEach((it, idx) => {
    db.db.structureElementItems.push({
      id: db.nextId("structureElementItems"),
      boqId: boq.id,
      elementId: idx < 3 ? elA.id : elB.id,
      itemId: it.id,
      qty: [120, 45, 12, 200, 50, 30][idx],
    });
    db.db.boqItems.push({
      id: db.nextId("boqItems"),
      boqId: boq.id,
      itemId: it.id,
      priority: it.priority,
      forSummary: it.priority !== "optional",
      amortization: it.amortization || 0,
      resourceTypeId: it.resourceTypeId,
      resourceId: null,
      description: it.description,
      chosenAlternativeId: null,
      parentId: it.parentId,
    });
  });
  db.persist();
  ui.toast("כתב הכמויות יובא בהצלחה");
  router.push(`/projects/${importProjectId.value}/quantities/${boq.id}`);
}
</script>

<template>
  <div>
    <PageHeader title="מיפוי כתב כמויות" :crumbs="['מערכת']">
      <template #actions>
        <button class="add-link" @click="createMapping">
          <span class="plus-disc"><AppIcon name="plus" :size="12" /></span>
          <span>יצירת מיפוי חדש</span>
        </button>
        <button class="btn btn-primary" @click="save">שמירה</button>
        <button class="btn btn-secondary" @click="router.back()">ביטול</button>
      </template>
    </PageHeader>

    <div class="card">
      <div v-if="importFile" class="import-banner">
        <AppIcon name="upload" :size="18" />
        <span
          >מייבא את הקובץ <span class="num">{{ importFile }}</span> — מפה את העמודות ולחץ "סיום מיפוי
          וייבוא"</span
        >
      </div>

      <div class="body">
        <!-- mapping types panel -->
        <aside class="panel">
          <div class="panel-box">סוגי מיפויים</div>
          <button class="ghost-btn" @click="createMapping">
            <span>חדש</span>
            <AppIcon name="plus-circle" :size="20" />
          </button>
          <div class="list scroll-slim">
            <div
              v-for="m in db.mappings"
              :key="m.id"
              class="list-row"
              :class="{ active: m.id === selectedId }"
              @click="selectedId = m.id"
            >
              <span class="ellipsis">{{ m.name }}</span>
              <button class="kebab" @click.stop="openMenu(m, $event)">
                <AppIcon name="kebab" :size="16" />
              </button>
            </div>
          </div>
        </aside>

        <section class="main">
          <div v-if="mapping" class="sub-header">
            <div class="sh-end">
              <input
                v-if="renaming"
                ref="nameInput"
                v-model="nameDraft"
                class="rename-input"
                @keyup.enter="commitRename"
                @keyup.esc="renaming = false"
                @blur="commitRename"
              />
              <h3 v-else class="map-name">{{ mapping.name }}</h3>
              <button class="icon-btn" title="שינוי שם" @click="startRename">
                <AppIcon name="pencil" :size="18" />
              </button>
              <span class="dot" />
              <span class="active-lbl">פעיל</span>
              <BaseToggle
                :model-value="mapping.active"
                @update:model-value="
                  (v) => {
                    mapping.active = v;
                    db.persist();
                  }
                "
              />
            </div>
            <div class="sh-start">
              <button class="tb-btn" disabled title="לא רלוונטי למיפוי">
                <AppIcon name="plus-circle" :size="20" /><span>סעיף</span>
              </button>
              <button class="tb-btn" disabled title="לא רלוונטי למיפוי">
                <AppIcon name="plus-circle" :size="20" /><span>תגית</span>
              </button>
              <span class="v-divider" />
              <SearchPill v-model="search" placeholder="חיפוש לפי פרק/סעיף/תת סעיף" />
            </div>
          </div>

          <template v-if="mapping">
            <p class="explain">לכל עמודה של מערכת "חישובים בראש טוב" בחר עמודה תואמת מ{{ mapping.name }}.</p>
            <div class="cols-head">
              <span class="ch-right">שם עמודה במערכת "חישובים בראש טוב"</span>
              <span class="ch-left">שם עמודה תואמת במערכת {{ mapping.name }}</span>
            </div>
            <div v-for="(f, i) in fields" :key="f.key" class="map-row">
              <span class="row-num num">{{ i + 1 }}<span v-if="f.required" class="req">*</span></span>
              <span class="sys-label">{{ f.label }}</span>
              <div class="combo">
                <input
                  :value="mapping.columns[f.key]"
                  :list="'map-opts-' + f.key"
                  class="input combo-input"
                  placeholder="בחר או הקלד ליצירת עמודה תואמת"
                  @change="setColumn(f.key, $event.target.value)"
                />
                <AppIcon name="chevron-down" :size="16" class="combo-chev" />
                <datalist :id="'map-opts-' + f.key">
                  <option v-for="s in SUGGESTIONS" :key="s" :value="s" />
                </datalist>
              </div>
            </div>
            <div v-if="importFile" class="finish-bar">
              <button
                class="btn btn-primary"
                :disabled="!requiredFilled"
                :title="requiredFilled ? '' : 'יש למפות את העמודות המסומנות בכוכבית'"
                @click="finishImport"
              >
                סיום מיפוי וייבוא
              </button>
              <span class="finish-hint">שדות המסומנים ב-<span class="req">*</span> הם חובה</span>
            </div>
          </template>
          <p v-else class="empty">אין סוגי מיפוי — לחץ "יצירת מיפוי חדש"</p>
        </section>
      </div>
    </div>

    <ContextMenu
      v-if="menu"
      :items="[
        { key: 'rename', label: 'שינוי שם', icon: 'pencil' },
        { key: 'delete', label: 'מחיקה', icon: 'trash', danger: true },
      ]"
      :x="menu.x"
      :y="menu.y"
      @select="onMenu"
      @close="menu = null"
    />
    <DeleteConfirmModal
      v-if="deleteTarget"
      title="מחיקת סוג מיפוי"
      :message="`האם למחוק את המיפוי &quot;${deleteTarget.name}&quot;?`"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.add-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 13px;
  font-weight: 600;
  margin-right: 8px;
}
.plus-disc {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.card {
  background: var(--surface);
  border-radius: var(--radius-card);
  min-height: calc(100vh - 128px);
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
}
.import-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--brand-primary-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.panel {
  width: 291px;
  flex-shrink: 0;
  border-left: 2px solid var(--divider);
  padding: 0 0 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.panel-box {
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-direction: row-reverse;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
  align-self: flex-end;
  height: 32px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.list-row {
  display: flex;
  align-items: center;
  height: 32px;
  border-radius: 8px;
  padding: 0 8px 0 4px;
  cursor: pointer;
  font-size: 14px;
}
.list-row .ellipsis {
  flex: 1;
  text-align: right;
}
.list-row:hover {
  background: var(--surface-subtle);
}
.list-row.active {
  background: var(--brand-primary-soft);
}
.kebab {
  background: none;
  border: none;
  color: var(--text-secondary);
  opacity: 0;
  display: inline-flex;
}
.list-row:hover .kebab {
  opacity: 1;
}
.main {
  flex: 1;
  min-width: 0;
  padding: 0 8px 0 16px;
}
.sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.sh-end {
  display: flex;
  align-items: center;
  gap: 10px;
}
.map-name {
  font-size: 16px;
  font-weight: 700;
}
.rename-input {
  border: 1px solid #6952ef;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  outline: none;
  width: 180px;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
}
.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-disabled);
}
.active-lbl {
  font-size: 13px;
  color: var(--text-secondary);
}
.sh-start {
  display: flex;
  align-items: center;
  gap: 14px;
}
.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-direction: row-reverse;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
  height: 40px;
}
.tb-btn:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}
.v-divider {
  width: 1px;
  height: 22px;
  background: var(--border-strong);
}
.explain {
  font-size: 13px;
  color: var(--text-primary);
  text-align: right;
  margin-bottom: 14px;
}
.cols-head {
  display: grid;
  grid-template-columns: 40px 200px 1fr;
  gap: 16px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
  padding: 0 12px;
}
.ch-right {
  grid-column: 2;
}
.ch-left {
  grid-column: 3;
  text-align: right;
}
.map-row {
  display: grid;
  grid-template-columns: 40px 200px 1fr;
  gap: 16px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  max-width: 720px;
  box-shadow: var(--shadow-card);
}
.row-num {
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}
.req {
  color: var(--danger);
  margin-right: 2px;
}
.sys-label {
  font-size: 14px;
}
.combo {
  position: relative;
}
.combo-input {
  padding-left: 32px;
}
.combo-chev {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}
.finish-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
}
.finish-hint {
  font-size: 12px;
  color: var(--text-secondary);
}
.empty {
  color: var(--text-muted);
  text-align: center;
  padding: 40px 0;
}
</style>
