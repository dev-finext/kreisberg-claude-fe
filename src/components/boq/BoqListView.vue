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
import SearchPill from "@/components/shared/SearchPill.vue";
import SlaDonut from "./SlaDonut.vue";
import CreateBoqModal from "./CreateBoqModal.vue";
import TenderModal from "./TenderModal.vue";
import BoqExportModal from "./BoqExportModal.vue";
import EmptyClipboard from "@/components/shared/EmptyClipboard.vue";
import ImportBoqDialog from "./ImportBoqDialog.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";
import { formatDate } from "@/utils/format";
import { BOQ_STATUS_LABELS } from "@/constants";

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
const tenderHeader = ref(null);
const exportHeader = ref(null);
const showImport = ref(false);
const expandedIds = ref([]);
const renamingDoc = ref(false);
const docNameDraft = ref("");

function toggleExpanded(id) {
  const i = expandedIds.value.indexOf(id);
  if (i >= 0) expandedIds.value.splice(i, 1);
  else expandedIds.value.push(id);
}
function startRenameDoc() {
  docNameDraft.value = docName.value;
  renamingDoc.value = true;
}
function commitRenameDoc() {
  const n = docNameDraft.value.trim();
  if (n) {
    for (const h of db.db.boqHeaders) if (h.projectId === projectId.value) h.docName = n;
    db.persist();
    ui.toast("שם המסמך עודכן");
  }
  renamingDoc.value = false;
}

const headers = computed(() => {
  const t = search.value.trim();
  return db.boqHeaders
    .filter((h) => h.projectId === projectId.value)
    .filter((h) => !t || h.name.includes(t) || (h.detail || "").includes(t));
});
const docName = computed(() => headers.value[0]?.docName || "בנארית");

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
  { key: "tender", label: "יציאה למכרז", icon: "megaphone" },
  { key: "print", label: "הדפסה / ייצוא", icon: "file" },
  { key: "delete", label: "מחיקה", icon: "trash", danger: true },
];
function onMenuSelect(key) {
  const h = menu.value.header;
  menu.value = null;
  if (key === "edit") editHeader.value = h;
  else if (key === "tender") tenderHeader.value = h;
  else if (key === "print") exportHeader.value = h;
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
        <SearchPill v-model="search" placeholder="חיפוש לפי פרק/סעיף/תת סעיף" />
        <button class="btn-text create-btn" @click="showCreate = true">
          <AppIcon name="plus-circle" :size="20" />
          <span>כתב כמויות חדש</span>
        </button>
        <button class="btn-text create-btn" @click="showImport = true">
          <AppIcon name="upload" :size="18" />
          <span>ייבוא כתב כמויות</span>
        </button>
      </div>
      <div class="sub-end">
        <input
          v-if="renamingDoc"
          v-model="docNameDraft"
          class="doc-rename"
          autofocus
          @keyup.enter="commitRenameDoc"
          @keyup.esc="renamingDoc = false"
          @blur="commitRenameDoc"
        />
        <h3 v-else class="doc-name" @dblclick="startRenameDoc">{{ docName }}</h3>
        <button class="icon-btn" title="עריכת שם המסמך" @click="startRenameDoc">
          <AppIcon name="pencil" :size="18" />
        </button>
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
          <template v-for="h in headers" :key="h.id">
            <tr class="boq-row" :class="{ open: expandedIds.includes(h.id) }" @click="openBoq(h)">
              <td class="td-check" @click.stop>
                <span class="row-expand" @click="toggleExpanded(h.id)">
                  <AppIcon :name="expandedIds.includes(h.id) ? 'chevron-down' : 'chevron-left'" :size="14" />
                </span>
                <BaseCheckbox
                  :model-value="checked.includes(h.id)"
                  @update:model-value="(v) => toggleChecked(h.id, v)"
                />
              </td>
              <td class="td-name">{{ h.name }}</td>
              <td class="td-detail ellipsis">{{ h.detail || "-" }}</td>
              <td class="num">{{ formatDate(h.exitDate) }}</td>
              <td><SlaDonut :sla="h.sla" /></td>
              <td>
                <div class="pills">
                  <span v-for="p in h.stagePills" :key="p.label" class="pill" :class="'pill-' + p.kind">
                    {{ p.label }}<span v-if="p.count" class="num"> ({{ p.count }})</span>
                  </span>
                  <span v-if="!h.stagePills.length" class="pill pill-neutral">{{
                    BOQ_STATUS_LABELS[h.status]
                  }}</span>
                </div>
              </td>
              <td class="td-notes ellipsis">{{ h.notes || "-" }}</td>
              <td class="td-kebab" @click.stop>
                <button class="icon-btn" @click="openMenu(h, $event)">
                  <AppIcon name="kebab" :size="18" />
                </button>
              </td>
            </tr>
            <tr v-if="expandedIds.includes(h.id)" class="expand-row">
              <td colspan="8">
                <div class="expand-panel">
                  <div class="ep-col">
                    <span class="ep-label">פירוט</span>
                    <span class="ep-value">{{ h.detail || "—" }}</span>
                  </div>
                  <div class="ep-col">
                    <span class="ep-label">קטלוג</span>
                    <span class="ep-value">{{
                      db.catalogs.find((c) => c.id === h.catalogId)?.name || "—"
                    }}</span>
                  </div>
                  <div class="ep-col">
                    <span class="ep-label">סיווג</span>
                    <span class="ep-value">{{ h.classification === "spec" ? "מפרט" : "תמחור" }}</span>
                  </div>
                  <div class="ep-col">
                    <span class="ep-label">סוג משאב</span>
                    <span class="ep-value">{{
                      db.resourceTypes.find((t) => t.id === h.resourceTypeId)?.name || "—"
                    }}</span>
                  </div>
                  <div class="ep-col">
                    <span class="ep-label">זיהוי משאב</span>
                    <span class="ep-value">{{
                      db.constructors.find((c) => c.id === h.resourceId)?.name || "—"
                    }}</span>
                  </div>
                  <div class="ep-col">
                    <span class="ep-label">נוצר</span>
                    <span class="ep-value num">{{ formatDate(h.createdAt) }}</span>
                  </div>
                  <div class="ep-col">
                    <span class="ep-label">מבנים / סעיפים</span>
                    <span class="ep-value num">
                      {{ db.structureElements.filter((e) => e.boqId === h.id).length }} /
                      {{ db.structureElementItems.filter((s) => s.boqId === h.id).length }}
                    </span>
                  </div>
                  <div class="ep-col">
                    <span class="ep-label">הערות</span>
                    <span class="ep-value">{{ h.notes || "—" }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- empty state -->
    <div v-else class="empty-state">
      <EmptyClipboard />
      <p class="empty-title">עדיין לא טענת כתבי כמויות</p>
      <p class="empty-sub">הם יופיעו כאן ברגע שיתווספו</p>
      <div class="empty-actions">
        <button class="btn btn-primary" @click="showCreate = true">כתב כמויות חדש</button>
        <button class="btn btn-secondary" @click="showImport = true">ייבוא כתב כמויות</button>
      </div>
    </div>

    <ContextMenu
      v-if="menu"
      :items="menuItems"
      :x="menu.x"
      :y="menu.y"
      @select="onMenuSelect"
      @close="menu = null"
    />
    <TenderModal v-if="tenderHeader" :boq-id="tenderHeader.id" @close="tenderHeader = null" />
    <BoqExportModal v-if="exportHeader" :boq-id="exportHeader.id" @close="exportHeader = null" />
    <ImportBoqDialog v-if="showImport" :project-id="projectId" @close="showImport = false" />
    <CreateBoqModal
      v-if="showCreate || editHeader"
      :project-id="projectId"
      :edit-header="editHeader"
      @close="
        showCreate = false;
        editHeader = null;
      "
      @saved="
        (h) => {
          showCreate = false;
          editHeader = null;
          openBoq(h);
        }
      "
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
  min-height: 0;
}
.table-wrap {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
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
.doc-rename {
  order: 4;
  border: 1px solid #6952ef;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  outline: none;
  width: 160px;
}
.boq-row.open {
  background: var(--row-open-bg);
}
.expand-row td {
  background: var(--row-open-bg);
  padding: 4px 24px 14px 60px;
}
.expand-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 18px;
}
.ep-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
}
.ep-label {
  font-size: 11px;
  color: var(--text-secondary);
}
.ep-value {
  font-size: 13px;
  color: var(--text-primary);
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
