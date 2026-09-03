<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import { formatDate, formatDateTime } from "@/utils/format";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import SearchPill from "@/components/shared/SearchPill.vue";
import ContextMenu from "@/components/shared/ContextMenu.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";
import BaseModal from "@/components/shared/BaseModal.vue";
import AddDocumentModal from "@/components/project/AddDocumentModal.vue";

const route = useRoute();
const db = useDbStore();
const ui = useUiStore();

const projectId = computed(() => Number(route.params.id));
const folders = computed(() => db.docFolders.filter((f) => f.projectId === projectId.value));
const selectedFolderId = ref(null); // null = הכל
const search = ref("");
const checked = ref([]);

const documents = computed(() => {
  const t = search.value.trim();
  return db.documents.filter(
    (d) =>
      d.projectId === projectId.value &&
      (selectedFolderId.value === null || d.folderId === selectedFolderId.value) &&
      (!t || d.name.includes(t))
  );
});

const allChecked = computed(
  () => documents.value.length > 0 && documents.value.every((d) => checked.value.includes(d.id))
);
function setAll(v) {
  checked.value = v ? documents.value.map((d) => d.id) : [];
}
function toggle(id, v) {
  if (v && !checked.value.includes(id)) checked.value.push(id);
  if (!v) checked.value = checked.value.filter((x) => x !== id);
}

function resourceTypeName(d) {
  return db.resourceTypes.find((t) => t.id === d.resourceTypeId)?.name || "---";
}
function resourceName(d) {
  return db.constructors.find((c) => c.id === d.resourceId)?.name || "---";
}

/* ---------- add / edit document ---------- */
const fileInput = ref(null);
const pickedFile = ref(null);
const editDoc = ref(null);
const showDocModal = ref(false);
function pickFile() {
  fileInput.value?.click();
}
function onFilePicked(e) {
  const f = e.target.files?.[0];
  e.target.value = "";
  if (!f) return;
  pickedFile.value = { name: f.name, size: f.size };
  editDoc.value = null;
  showDocModal.value = true;
}
function openEdit(d) {
  editDoc.value = d;
  pickedFile.value = null;
  showDocModal.value = true;
}

/* ---------- folders ---------- */
const folderModal = ref(null); // {folder|null}
const folderName = ref("");
const folderMenu = ref(null);
const deleteFolder = ref(null);
function openNewFolder() {
  folderModal.value = { folder: null };
  folderName.value = "";
}
function saveFolder() {
  const name = folderName.value.trim();
  if (!name) {
    ui.toast("נא להזין שם תיקיה", "warning");
    return;
  }
  if (folderModal.value.folder) {
    folderModal.value.folder.name = name;
    ui.toast("התיקיה עודכנה");
  } else {
    const f = { id: db.nextId("docFolders"), projectId: projectId.value, name };
    db.db.docFolders.push(f);
    selectedFolderId.value = f.id;
    ui.toast("התיקיה נוצרה");
  }
  db.persist();
  folderModal.value = null;
}
function openFolderMenu(f, e) {
  const rect = e.currentTarget.getBoundingClientRect();
  folderMenu.value = { folder: f, x: rect.left - 150, y: rect.bottom + 4 };
}
function onFolderMenu(key) {
  const f = folderMenu.value.folder;
  folderMenu.value = null;
  if (key === "rename") {
    folderModal.value = { folder: f };
    folderName.value = f.name;
  } else if (key === "delete") {
    deleteFolder.value = f;
  }
}
function confirmDeleteFolder() {
  const f = deleteFolder.value;
  for (const d of db.db.documents) if (d.folderId === f.id) d.folderId = null;
  db.db.docFolders = db.db.docFolders.filter((x) => x.id !== f.id);
  if (selectedFolderId.value === f.id) selectedFolderId.value = null;
  db.persist();
  deleteFolder.value = null;
  ui.toast('התיקיה נמחקה; המסמכים הועברו ל"הכל"');
}

/* ---------- row kebab / delete ---------- */
const rowMenu = ref(null);
const deleteTarget = ref(null); // doc or 'checked'
function openRowMenu(d, e) {
  const rect = e.currentTarget.getBoundingClientRect();
  rowMenu.value = { doc: d, x: rect.left - 150, y: rect.bottom + 4 };
}
function onRowMenu(key) {
  const d = rowMenu.value.doc;
  rowMenu.value = null;
  if (key === "edit") openEdit(d);
  if (key === "delete") deleteTarget.value = d;
}
function confirmDelete() {
  const ids = deleteTarget.value === "checked" ? [...checked.value] : [deleteTarget.value.id];
  db.db.documents = db.db.documents.filter((d) => !ids.includes(d.id));
  checked.value = checked.value.filter((id) => !ids.includes(id));
  db.persist();
  deleteTarget.value = null;
  ui.toast(ids.length === 1 ? "המסמך נמחק" : `${ids.length} מסמכים נמחקו`);
}
</script>

<template>
  <div class="docs-tab">
    <!-- right: folders panel -->
    <aside class="folders-panel">
      <h3 class="panel-title">מסמכי הפרויקט</h3>
      <button class="ghost-btn" @click="openNewFolder">
        <span>חדש</span>
        <AppIcon name="plus-circle" :size="20" />
      </button>
      <div class="panel-divider" />
      <div class="folder-list scroll-slim">
        <button
          class="folder-row"
          :class="{ active: selectedFolderId === null }"
          @click="selectedFolderId = null"
        >
          <AppIcon name="folder-open" :size="18" />
          <span class="folder-name ellipsis">הכל</span>
        </button>
        <div v-for="f in folders" :key="f.id" class="folder-row-wrap">
          <button
            class="folder-row"
            :class="{ active: selectedFolderId === f.id }"
            @click="selectedFolderId = f.id"
          >
            <AppIcon :name="selectedFolderId === f.id ? 'folder-open' : 'folder'" :size="18" />
            <span class="folder-name ellipsis">{{ f.name }}</span>
          </button>
          <button class="folder-kebab" @click.stop="openFolderMenu(f, $event)">
            <AppIcon name="kebab" :size="16" />
          </button>
        </div>
      </div>
    </aside>

    <!-- main -->
    <section class="docs-main">
      <div class="toolbar">
        <div class="tb-start">
          <button class="ghost-btn" @click="pickFile">
            <span>מסמך</span>
            <AppIcon name="plus-circle" :size="20" />
          </button>
          <span class="v-divider" />
          <SearchPill v-model="search" placeholder="חיפוש לפי פרק/סעיף/תת סעיף" />
          <input ref="fileInput" type="file" hidden @change="onFilePicked" />
        </div>
        <span class="count"
          ><span class="num">{{ documents.length }}</span> מסמכים קיימים</span
        >
      </div>

      <table v-if="documents.length" class="docs-table">
        <thead>
          <tr>
            <th class="th-check"><BaseCheckbox :model-value="allChecked" @update:model-value="setAll" /></th>
            <th>שם המסמך <AppIcon name="chevron-down" :size="12" /></th>
            <th>סוג הקובץ <AppIcon name="chevron-down" :size="12" /></th>
            <th>תת-סוג מסמך <AppIcon name="chevron-down" :size="12" /></th>
            <th>משאב <AppIcon name="chevron-down" :size="12" /></th>
            <th>סוג המשאב <AppIcon name="chevron-down" :size="12" /></th>
            <th>תאריך יצירה <AppIcon name="chevron-down" :size="12" /></th>
            <th>תאריך עדכון אחרון <AppIcon name="chevron-down" :size="12" /></th>
            <th class="th-kebab">
              <button
                v-if="checked.length"
                class="icon-btn danger"
                title="מחיקת המסמכים המסומנים"
                @click="deleteTarget = 'checked'"
              >
                <AppIcon name="trash" :size="17" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in documents" :key="d.id" class="row" :class="{ checked: checked.includes(d.id) }">
            <td class="td-check">
              <BaseCheckbox
                :model-value="checked.includes(d.id)"
                @update:model-value="(v) => toggle(d.id, v)"
              />
            </td>
            <td class="td-name">
              <AppIcon name="file" :size="18" class="file-ico" />
              <span class="ellipsis">{{ d.name }}</span>
            </td>
            <td class="num">{{ d.fileType }}</td>
            <td>{{ d.subType || "---" }}</td>
            <td>{{ resourceTypeName(d) }}</td>
            <td class="ellipsis">{{ resourceName(d) }}</td>
            <td class="num">{{ formatDate(d.createdAt) }}</td>
            <td class="num">{{ formatDateTime(d.updatedAt) }}</td>
            <td class="td-kebab">
              <button class="icon-btn" @click="openRowMenu(d, $event)">
                <AppIcon name="kebab" :size="16" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">
        <svg width="150" height="136" viewBox="0 0 150 136" fill="none">
          <ellipse cx="75" cy="118" rx="55" ry="8" fill="#EEF2FA" />
          <rect x="45" y="18" width="60" height="86" rx="6" stroke="#BBC5CF" stroke-width="2.5" fill="#fff" />
          <path
            d="M56 40h28M56 54h38M56 68h32M56 82h20"
            stroke="#BBC5CF"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
        <p class="empty-title">עדיין אין כאן מסמכים</p>
        <p class="empty-sub">הם יופיעו כאן ברגע שיתווספו</p>
        <button class="btn btn-primary" @click="pickFile">הוספת מסמך</button>
      </div>
    </section>

    <!-- modals / menus -->
    <AddDocumentModal
      v-if="showDocModal"
      :project-id="projectId"
      :folder-id="selectedFolderId"
      :file="pickedFile"
      :document="editDoc"
      @close="showDocModal = false"
      @saved="showDocModal = false"
    />
    <BaseModal
      v-if="folderModal"
      :title="folderModal.folder ? 'שינוי שם תיקיה' : 'תיקיה חדשה'"
      width="420px"
      :confirm-disabled="!folderName.trim()"
      @close="folderModal = null"
      @confirm="saveFolder"
    >
      <label class="field-label">שם התיקיה</label>
      <input
        v-model="folderName"
        class="input"
        placeholder="לדוגמה: תכניות אדריכליות"
        @keyup.enter="saveFolder"
      />
    </BaseModal>
    <ContextMenu
      v-if="folderMenu"
      :items="[
        { key: 'rename', label: 'שינוי שם', icon: 'pencil' },
        { key: 'delete', label: 'מחיקה', icon: 'trash', danger: true },
      ]"
      :x="folderMenu.x"
      :y="folderMenu.y"
      @select="onFolderMenu"
      @close="folderMenu = null"
    />
    <ContextMenu
      v-if="rowMenu"
      :items="[
        { key: 'edit', label: 'עריכה', icon: 'pencil' },
        { key: 'delete', label: 'מחיקה', icon: 'trash', danger: true },
      ]"
      :x="rowMenu.x"
      :y="rowMenu.y"
      @select="onRowMenu"
      @close="rowMenu = null"
    />
    <DeleteConfirmModal
      v-if="deleteTarget"
      title="מחיקת מסמך"
      :message="
        deleteTarget === 'checked'
          ? `האם למחוק ${checked.length} מסמכים?`
          : `האם למחוק את &quot;${deleteTarget.name}&quot;?`
      "
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
    <DeleteConfirmModal
      v-if="deleteFolder"
      title="מחיקת תיקיה"
      :message="`האם למחוק את התיקיה &quot;${deleteFolder.name}&quot;?`"
      detail='המסמכים שבתיקיה יועברו ל"הכל"'
      @close="deleteFolder = null"
      @confirm="confirmDeleteFolder"
    />
  </div>
</template>

<style scoped>
.docs-tab {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 12px 0 0;
}
/* folders panel (right) */
.folders-panel {
  width: 250px;
  flex-shrink: 0;
  border-left: 2px solid var(--divider);
  padding: 10px 24px 16px 16px;
  display: flex;
  flex-direction: column;
}
.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: right;
  margin-bottom: 14px;
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
  padding: 0;
  align-self: flex-end;
}
.panel-divider {
  height: 1px;
  background: var(--divider);
  margin: 10px 0 6px;
}
.folder-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.folder-row-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.folder-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  border-radius: 8px;
  padding: 0 8px;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  text-align: right;
}
.folder-row:hover {
  background: var(--surface-subtle);
}
.folder-row.active {
  background: var(--brand-primary-soft);
}
.folder-row :deep(svg) {
  color: var(--text-secondary);
  flex-shrink: 0;
}
.folder-name {
  flex: 1;
}
.folder-kebab {
  position: absolute;
  left: 4px;
  background: none;
  border: none;
  color: var(--text-secondary);
  opacity: 0;
  display: inline-flex;
  padding: 2px;
}
.folder-row-wrap:hover .folder-kebab {
  opacity: 1;
}
/* main */
.docs-main {
  flex: 1;
  min-width: 0;
  padding: 10px 24px 24px;
  overflow-y: auto;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  margin-bottom: 14px;
}
.tb-start {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tb-start .ghost-btn {
  align-self: center;
}
.v-divider {
  width: 1px;
  height: 22px;
  background: var(--border-strong);
}
.count {
  font-size: 13px;
  color: var(--text-secondary);
}
.docs-table {
  width: 100%;
  border-collapse: collapse;
}
.docs-table th {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-strong);
  white-space: nowrap;
}
.docs-table td {
  font-size: 13px;
  text-align: right;
  padding: 10px 12px;
  border-bottom: 1px solid var(--divider);
  height: 48px;
}
.row:hover {
  background: var(--surface-subtle);
}
.row.checked {
  background: var(--brand-primary-soft);
}
.td-name {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 260px;
}
.file-ico {
  color: var(--brand-primary);
  flex-shrink: 0;
}
.th-kebab,
.td-kebab {
  width: 44px;
  text-align: left;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
  padding: 2px;
}
.icon-btn.danger {
  color: var(--danger);
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 0;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
}
.empty-sub {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
  text-align: right;
}
</style>
