<script setup>
import { ref, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import { formatDate, formatStamp } from "@/utils/format";
import PageHeader from "@/components/layout/PageHeader.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import ContextMenu from "@/components/shared/ContextMenu.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";
import EmptyClipboard from "@/components/shared/EmptyClipboard.vue";
import { useFlash } from "@/composables/useFlash";

const router = useRouter();
const db = useDbStore();
const ui = useUiStore();

const menu = ref(null);
const deleteTarget = ref(null);

/* "הוספת קטלוג חדש" opens an editable first row with ✓ / ✕ (Figma: מסך מאסטר-הוספת קטלוג חדש);
   on confirm the new catalog stays in the list, highlighted, and עריכה on hover enters it. */
const adding = ref(false);
const newName = ref("");
const newActive = ref(true);
const newInput = ref(null);
const flashNew = useFlash("catalog");

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
    flashNew.flash(copy.id);
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

async function startAdd() {
  adding.value = true;
  newName.value = "";
  newActive.value = true;
  await nextTick();
  newInput.value?.focus();
}
function cancelAdd() {
  adding.value = false;
}
function confirmAdd() {
  const name = newName.value.trim();
  if (!name) return;
  const c = {
    id: db.nextId("catalogs"),
    name,
    active: newActive.value,
    uploadedAt: today(),
    updatedAt: new Date().toISOString(),
  };
  db.db.catalogs.unshift(c); // lands where the editing row was
  db.persist();
  adding.value = false;
  flashNew.flash(c.id);
  ui.toast("הקטלוג נוצר בהצלחה");
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
        <button class="add-link" :disabled="adding" @click="startAdd">
          <span>הוספת קטלוג חדש</span>
          <AppIcon name="plus-circle" :size="24" />
        </button>
        <h3 class="card-title">רשימת קטלוגים</h3>
      </div>

      <table class="cat-table">
        <thead>
          <tr>
            <th class="col-name">שם קטלוג <AppIcon name="chevron-down" :size="12" /></th>
            <th class="col-status">סטטוס <AppIcon name="chevron-down" :size="12" /></th>
            <th class="col-uploaded">תאריך העלאה <AppIcon name="chevron-down" :size="12" /></th>
            <th class="col-updated">תאריך עדכון אחרון <AppIcon name="chevron-down" :size="12" /></th>
            <th class="th-kebab"></th>
          </tr>
        </thead>
        <tbody>
          <!-- inline add row -->
          <tr v-if="adding" class="row adding">
            <td class="td-name">
              <input
                ref="newInput"
                v-model="newName"
                class="name-input"
                placeholder="שם הקטלוג"
                @keyup.enter="confirmAdd"
                @keyup.esc="cancelAdd"
              />
            </td>
            <td>
              <div class="status-cell">
                <BaseToggle v-model="newActive" />
                <span>{{ newActive ? "פעיל" : "לא פעיל" }}</span>
              </div>
            </td>
            <td class="num">{{ formatDate(today()) }}</td>
            <td class="num">{{ formatStamp(new Date().toISOString()) }}</td>
            <td class="td-kebab">
              <div class="act-wrap">
                <button class="act" title="אישור" :disabled="!newName.trim()" @click="confirmAdd">
                  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill="#5b93ef" />
                    <path
                      d="M7 12.5l3 3 7-7"
                      fill="none"
                      stroke="#fff"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button class="act" title="ביטול" @click="cancelAdd">
                  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                    <circle cx="12" cy="12" r="11" fill="none" stroke="#bbc5cf" stroke-width="1.5" />
                    <path
                      d="M8.5 8.5l7 7M15.5 8.5l-7 7"
                      stroke="#70869e"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr
            v-for="c in db.catalogs"
            :key="c.id"
            class="row"
            :class="{ 'flash-new': flashNew.isNew(c.id) }"
            :data-flash="flashNew.mark(c.id)"
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
            <td class="num">{{ formatStamp(c.updatedAt) }}</td>
            <td class="td-kebab" @click.stop>
              <button class="icon-btn" @click="openMenu(c, $event)">
                <AppIcon name="kebab" :size="16" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- empty state (Figma: header stays, illustration + texts + CTA below) -->
      <div v-if="!db.catalogs.length && !adding" class="empty">
        <EmptyClipboard />
        <p class="empty-title">עדיין לא נוספו קטלוגים</p>
        <p class="empty-sub">אפשר להוסיף קטלוג חדש</p>
        <button class="btn btn-primary empty-cta" @click="startAdd">הוספת קטלוג חדש</button>
      </div>
    </div>

    <ContextMenu
      v-if="menu"
      :items="MENU_ITEMS"
      :x="menu.x"
      :y="menu.y"
      @select="onMenu"
      @close="menu = null"
    />
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
/* page sub header (Figma "Page sub header"): 32px tall, 16px gap to the table */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  height: 32px;
  margin-bottom: 16px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  color: var(--text-secondary);
}
.add-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 40px;
  padding: 0 8px;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
}
.add-link:disabled {
  color: var(--text-disabled);
  cursor: default;
}
/* "Catalog table master": fixed column widths, 48px rows, gray-light dividers, gray hover */
.cat-table {
  border-collapse: collapse;
  table-layout: fixed;
  margin-right: 0;
  margin-left: auto;
}
.cat-table th {
  height: 48px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
  padding: 0 12px 0 36px;
  border-bottom: 1px solid var(--border-strong);
  white-space: nowrap;
}
.cat-table td {
  height: 48px;
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
  padding: 0 12px 0 36px;
  border-bottom: 1px solid var(--surface-muted);
}
.col-name {
  width: 210px;
}
.col-status {
  width: 158px;
}
.col-uploaded {
  width: 135px;
}
.col-updated {
  width: 154px;
}
.row {
  cursor: pointer;
}
.row:hover {
  background: #f7f7f7;
}
.row.adding {
  cursor: default;
}
.row.adding .td-name {
  padding-right: 4px;
}
.td-name {
  font-weight: 400;
}
/* inline-edit field (Figma: purple #8060DD border, radius 8) */
.name-input {
  width: 162px;
  height: 34px;
  border: 1px solid #8060dd;
  border-radius: 8px;
  padding: 0 8px;
  font-size: 14px;
  font-family: inherit;
  color: var(--text-primary);
  text-align: right;
  background: var(--surface);
  outline: none;
}
.status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.th-kebab,
.td-kebab {
  width: 60px;
  padding: 0 5px;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
  padding: 2px;
  opacity: 0; /* appears on row hover (design note on the master screen) */
}
.row:hover .icon-btn {
  opacity: 1;
}
/* ✓ / ✕ for the add row: ✓ sits nearer the content, ✕ at the far left */
.act-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}
.act {
  background: none;
  border: none;
  padding: 0;
  display: inline-flex;
  line-height: 0;
}
.act:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
/* empty state */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 72px 0 40px;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
}
.empty-sub {
  font-size: 14px;
  color: var(--text-muted);
}
.empty-cta {
  margin-top: 24px;
  min-width: 199px;
}
</style>
