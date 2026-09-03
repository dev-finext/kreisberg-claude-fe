<script setup>
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import { formatDate, formatDateTime } from "@/utils/format";
import PageHeader from "@/components/layout/PageHeader.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import BaseModal from "@/components/shared/BaseModal.vue";
import ContextMenu from "@/components/shared/ContextMenu.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";

const router = useRouter();
const db = useDbStore();
const ui = useUiStore();

const menu = ref(null);
const showCreate = ref(false);
const deleteTarget = ref(null);
const form = reactive({ name: "" });

const MENU_ITEMS = [
  { key: "edit", label: "עריכה", icon: "pencil" },
  { key: "duplicate", label: "שכפול", icon: "copy" },
  { key: "tags", label: "ניהול תגיות", icon: "tag" },
  { key: "delete", label: "מחיקה", icon: "trash", danger: true },
];

function openMenu(c, e) {
  const rect = e.currentTarget.getBoundingClientRect();
  menu.value = { catalog: c, x: rect.left - 160, y: rect.bottom + 4 };
}
function onMenu(key) {
  const c = menu.value.catalog;
  menu.value = null;
  if (key === "edit") router.push(`/system/catalogs/${c.id}`);
  else if (key === "duplicate") {
    const copy = {
      ...c,
      id: db.nextId("catalogs"),
      name: `${c.name} - העתק`,
      uploadedAt: today(),
      updatedAt: new Date().toISOString(),
    };
    db.db.catalogs.push(copy);
    db.persist();
    ui.toast(`הקטלוג שוכפל: ${copy.name}`);
  } else if (key === "tags") router.push("/system/tags");
  else if (key === "delete") deleteTarget.value = c;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function setActive(c, v) {
  c.active = v;
  c.updatedAt = new Date().toISOString();
  db.persist();
  ui.toast(v ? `הקטלוג "${c.name}" הופעל` : `הקטלוג "${c.name}" הושבת`);
}
function create() {
  if (!form.name.trim()) return;
  const c = {
    id: db.nextId("catalogs"),
    name: form.name.trim(),
    active: true,
    uploadedAt: today(),
    updatedAt: new Date().toISOString(),
  };
  db.db.catalogs.push(c);
  db.persist();
  showCreate.value = false;
  form.name = "";
  ui.toast("הקטלוג נוצר בהצלחה");
  router.push(`/system/catalogs/${c.id}`);
}
function confirmDelete() {
  const c = deleteTarget.value;
  db.db.catalogs = db.db.catalogs.filter((x) => x.id !== c.id);
  db.persist();
  deleteTarget.value = null;
  ui.toast(`הקטלוג "${c.name}" נמחק`);
}
</script>

<template>
  <div>
    <PageHeader title="קטלוגים" :crumbs="['מערכת']">
      <template #actions>
        <button class="btn btn-primary" @click="ui.toast('השינויים נשמרו')">שמירה</button>
      </template>
    </PageHeader>

    <div class="card">
      <div class="card-head">
        <button class="add-link" @click="showCreate = true">
          <span class="plus-disc"><AppIcon name="plus" :size="12" /></span>
          <span>הוספת קטלוג חדש</span>
        </button>
        <h3 class="card-title">רשימת קטלוגים</h3>
      </div>

      <table class="cat-table">
        <thead>
          <tr>
            <th>שם קטלוג <AppIcon name="chevron-down" :size="12" /></th>
            <th>סטטוס <AppIcon name="chevron-down" :size="12" /></th>
            <th>תאריך העלאה <AppIcon name="chevron-down" :size="12" /></th>
            <th>תאריך עדכון אחרון <AppIcon name="chevron-down" :size="12" /></th>
            <th class="th-kebab"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(c, i) in db.catalogs"
            :key="c.id"
            class="row"
            :class="{ zebra: i % 2 === 1 }"
            @click="router.push(`/system/catalogs/${c.id}`)"
          >
            <td class="td-name">{{ c.name }}</td>
            <td @click.stop>
              <div class="status-cell">
                <BaseToggle :model-value="c.active" @update:model-value="(v) => setActive(c, v)" />
                <span>{{ c.active ? "פעיל" : "לא פעיל" }}</span>
              </div>
            </td>
            <td class="num">{{ formatDate(c.uploadedAt) }}</td>
            <td class="num">{{ formatDateTime(c.updatedAt) }}</td>
            <td class="td-kebab" @click.stop>
              <button class="icon-btn" @click="openMenu(c, $event)">
                <AppIcon name="kebab" :size="16" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ContextMenu
      v-if="menu"
      :items="MENU_ITEMS"
      :x="menu.x"
      :y="menu.y"
      @select="onMenu"
      @close="menu = null"
    />
    <BaseModal
      v-if="showCreate"
      title="הוספת קטלוג חדש"
      width="477px"
      :confirm-disabled="!form.name.trim()"
      @close="showCreate = false"
      @confirm="create"
    >
      <div class="fields">
        <div class="field">
          <label class="field-label">שם קטלוג</label>
          <input v-model="form.name" class="input" placeholder="הקלד שם קטלוג" @keyup.enter="create" />
        </div>
      </div>
    </BaseModal>
    <DeleteConfirmModal
      v-if="deleteTarget"
      title="מחיקת קטלוג"
      :message="`האם למחוק את הקטלוג &quot;${deleteTarget.name}&quot;?`"
      detail="כתבי כמויות שמשויכים לקטלוג ימשיכו לפעול על עותק הנתונים שלהם"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.card {
  background: var(--surface);
  border-radius: var(--radius-card);
  min-height: calc(100vh - 128px);
  padding: 20px 24px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  margin-bottom: 14px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.add-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 13px;
  font-weight: 600;
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
.cat-table {
  width: 100%;
  max-width: 720px;
  border-collapse: collapse;
  margin-right: 0;
  margin-left: auto;
}
.cat-table th {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
  padding: 10px 14px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
}
.cat-table td {
  font-size: 13px;
  text-align: right;
  padding: 8px 14px;
  border-bottom: 1px solid var(--divider);
  height: 40px;
}
.row {
  cursor: pointer;
}
.row.zebra {
  background: var(--surface-subtle);
}
.row:hover {
  background: var(--brand-primary-soft);
}
.td-name {
  font-weight: 500;
}
.status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.th-kebab,
.td-kebab {
  width: 40px;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
  padding: 2px;
}
.fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
  text-align: right;
}
</style>
