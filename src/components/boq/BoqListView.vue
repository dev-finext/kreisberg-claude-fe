<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useBoqStore } from "@/stores/boq";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import ContextMenu from "@/components/shared/ContextMenu.vue";
import SlaDonut from "./SlaDonut.vue";
import CreateBoqModal from "./CreateBoqModal.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";

const route = useRoute();
const router = useRouter();
const db = useDbStore();
const boqStore = useBoqStore();
const ui = useUiStore();

const projectId = computed(() => Number(route.params.id));
const search = ref("");
const active = ref(true);
const menu = ref(null); // {header, x, y}
const showCreate = ref(false);
const editHeader = ref(null);
const deleteTarget = ref(null);
const checked = ref([]);

const headers = computed(() => {
  const t = search.value.trim();
  return db.boqHeaders
    .filter((h) => h.projectId === projectId.value)
    .filter((h) => !t || h.name.includes(t) || (h.detail || "").includes(t));
});
const docName = computed(() => headers.value[0]?.docName || "בנארית");

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function openBoq(h) {
  router.push(`/projects/${projectId.value}/quantities/${h.id}`);
}
function openMenu(h, e) {
  const rect = e.currentTarget.getBoundingClientRect();
  menu.value = { header: h, x: rect.left - 180, y: rect.bottom + 4 };
}
const menuItems = [
  { key: "edit", label: "עריכה", icon: "pencil" },
  { key: "duplicate", label: "שכפול", icon: "copy" },
  { key: "tender", label: "יציאה למכרז", icon: "megaphone", disabled: true },
  { key: "delete", label: "מחיקה", icon: "trash", danger: true },
];
function onMenuSelect(key) {
  const h = menu.value.header;
  menu.value = null;
  if (key === "edit") editHeader.value = h;
  else if (key === "duplicate") {
    const copy = boqStore.duplicateBoqHeader(h.id);
    if (copy) ui.toast(`התצורה שוכפלה: ${copy.name}`);
  } else if (key === "delete") deleteTarget.value = h;
}
function confirmDelete() {
  boqStore.deleteBoqHeader(deleteTarget.value.id);
  ui.toast("כתב הכמויות נמחק");
  deleteTarget.value = null;
}
function toggleChecked(id, v) {
  if (v && !checked.value.includes(id)) checked.value.push(id);
  if (!v) checked.value = checked.value.filter((x) => x !== id);
}
</script>

<template>
  <div class="boq-list">
    <!-- sub header: doc name + pencil · selects · פעיל toggle · search left -->
    <div class="sub-header">
      <div class="sub-start">
        <div class="search-pill">
          <input v-model="search" placeholder="חיפוש לפי פרק/סעיף/תת סעיף" />
          <AppIcon name="search" :size="20" />
        </div>
        <button class="btn-text create-btn" @click="showCreate = true">
          <AppIcon name="plus-circle" :size="20" />
          <span>כתב כמויות חדש</span>
        </button>
      </div>
      <div class="sub-end">
        <h3 class="doc-name">{{ docName }}</h3>
        <button class="icon-btn" title="עריכת שם המסמך"><AppIcon name="pencil" :size="18" /></button>
        <select class="select lang-select" disabled title="לא זמין בדמו">
          <option>עברית</option>
        </select>
        <div class="active-toggle">
          <span class="active-lbl">פעיל</span>
          <BaseToggle v-model="active" />
        </div>
      </div>
    </div>

    <!-- configurations table -->
    <div v-if="headers.length" class="table-wrap">
      <table class="boq-table">
        <thead>
          <tr>
            <th class="th-check"></th>
            <th>שם התצורה</th>
            <th>פירוט</th>
            <th>תאריך יציאה</th>
            <th>שליחת תמחור SLA</th>
            <th>סטטוס</th>
            <th>הערות</th>
            <th class="th-kebab"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in headers" :key="h.id" class="boq-row" @click="openBoq(h)">
            <td class="td-check" @click.stop>
              <span class="row-expand"><AppIcon name="chevron-left" :size="14" /></span>
              <BaseCheckbox :model-value="checked.includes(h.id)" @update:model-value="(v) => toggleChecked(h.id, v)" />
            </td>
            <td class="td-name">{{ h.name }}</td>
            <td class="td-detail ellipsis">{{ h.detail || "-" }}</td>
            <td class="num">{{ fmtDate(h.exitDate) }}</td>
            <td><SlaDonut :sla="h.sla" /></td>
            <td>
              <div class="pills">
                <span v-for="p in h.stagePills" :key="p.label" class="pill" :class="'pill-' + p.kind">
                  {{ p.label }}<span v-if="p.count" class="num"> ({{ p.count }})</span>
                </span>
                <span v-if="!h.stagePills.length" class="pill pill-neutral">{{
                  h.status === "draft" ? "טיוטה" : h.status === "final" ? "סופי" : "נעול"
                }}</span>
              </div>
            </td>
            <td class="td-notes ellipsis">{{ h.notes || "-" }}</td>
            <td class="td-kebab" @click.stop>
              <button class="icon-btn" @click="openMenu(h, $event)"><AppIcon name="kebab" :size="18" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- empty state -->
    <div v-else class="empty-state">
      <div class="empty-art">
        <svg width="150" height="136" viewBox="0 0 150 136" fill="none">
          <ellipse cx="75" cy="118" rx="55" ry="8" fill="#EEF2FA" />
          <rect x="45" y="18" width="60" height="86" rx="6" stroke="#BBC5CF" stroke-width="2.5" fill="#fff" />
          <rect x="62" y="10" width="26" height="14" rx="4" stroke="#BBC5CF" stroke-width="2.5" fill="#fff" />
          <path d="M56 40h28M56 54h38M56 68h32M56 82h20" stroke="#BBC5CF" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </div>
      <p class="empty-title">עדיין לא טענת כתבי כמויות</p>
      <p class="empty-sub">הם יופיעו כאן ברגע שיתווספו</p>
      <div class="empty-actions">
        <button class="btn btn-primary" @click="showCreate = true">כתב כמויות חדש</button>
        <button class="btn btn-secondary" disabled title="לא זמין בדמו">ייבוא כתב כמויות</button>
      </div>
    </div>

    <ContextMenu v-if="menu" :items="menuItems" :x="menu.x" :y="menu.y" @select="onMenuSelect" @close="menu = null" />
    <CreateBoqModal
      v-if="showCreate || editHeader"
      :project-id="projectId"
      :edit-header="editHeader"
      @close="showCreate = false; editHeader = null"
      @saved="(h) => { showCreate = false; editHeader = null; openBoq(h); }"
    />
    <DeleteConfirmModal
      v-if="deleteTarget"
      title="מחיקת כתב כמויות"
      message="האם אתה בטוח שברצונך למחוק את כתב הכמויות?"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.boq-list {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.sub-end {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row;
}
.doc-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  order: 4;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
  padding: 3px;
}
.sub-end .icon-btn {
  order: 3;
}
.lang-select {
  width: 96px;
  height: 32px;
  order: 2;
}
.active-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row-reverse;
  order: 1;
}
.active-lbl {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.sub-start {
  display: flex;
  align-items: center;
  gap: 16px;
}
.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-direction: row-reverse;
  font-weight: 600;
  font-size: 13px;
}
.search-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row-reverse;
  background: var(--surface-muted);
  border-radius: var(--radius-pill);
  height: 40px;
  padding: 0 16px;
  width: 226px;
  color: var(--text-disabled);
}
.search-pill input {
  border: none;
  background: none;
  outline: none;
  flex: 1;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.search-pill input::placeholder {
  color: var(--text-disabled);
}
/* table */
.boq-table {
  width: 100%;
  border-collapse: collapse;
}
.boq-table th {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
  padding: 10px 14px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
}
.boq-table td {
  font-size: 13px;
  color: var(--text-primary);
  text-align: right;
  padding: 8px 14px;
  border-bottom: 1px solid var(--divider);
}
.boq-row {
  cursor: pointer;
}
.boq-row:hover {
  background: var(--surface-subtle);
}
.td-check {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 56px;
}
.row-expand {
  color: var(--text-muted);
  display: inline-flex;
}
.td-name {
  font-weight: 500;
  white-space: nowrap;
}
.td-detail,
.td-notes {
  max-width: 200px;
}
.pills {
  display: flex;
  gap: 6px;
}
.td-kebab {
  width: 40px;
}
/* empty state */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.empty-sub {
  font-size: 14px;
  color: var(--text-muted);
}
.empty-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
</style>
