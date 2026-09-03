<script setup>
import { ref, computed, reactive, nextTick } from "vue";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import PageHeader from "@/components/layout/PageHeader.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import SearchPill from "@/components/shared/SearchPill.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";

/**
 * Generic list + inline-CRUD screen for the simple מערכת (system) collections
 * (resource types, resource library, project categories, templates). Writes
 * straight to the db store so every row is a working demo record.
 */
const props = defineProps({
  title: { type: String, required: true },
  crumbs: { type: Array, default: () => ["מערכת"] },
  addLabel: { type: String, default: "הוספה" },
  emptyText: { type: String, default: "עדיין אין רשומות — הוסף כדי להתחיל" },
  collection: { type: String, required: true },
  /** [{ key, label, editor: 'text'|'select', options?: [{value,label}], align? }] */
  columns: { type: Array, required: true },
  /** factory returning a blank row (without id) */
  makeNew: { type: Function, required: true },
});

const db = useDbStore();
const ui = useUiStore();

const search = ref("");
const editingId = ref(null); // id or 'new'
const draft = reactive({});
const deleteTarget = ref(null);
const firstInput = ref(null);

const rows = computed(() => {
  const t = search.value.trim();
  const list = db.db[props.collection] || [];
  if (!t) return list;
  return list.filter((r) => props.columns.some((c) => String(displayValue(r, c)).includes(t)));
});

function displayValue(row, col) {
  const v = row[col.key];
  if (col.editor === "select") {
    return col.options.find((o) => o.value === v)?.label ?? "—";
  }
  return v ?? "—";
}

function startAdd() {
  Object.assign(draft, props.makeNew());
  editingId.value = "new";
  focusFirst();
}
function startEdit(row) {
  Object.keys(draft).forEach((k) => delete draft[k]);
  Object.assign(draft, JSON.parse(JSON.stringify(row)));
  editingId.value = row.id;
  focusFirst();
}
function focusFirst() {
  nextTick(() => firstInput.value?.[0]?.focus?.());
}
function cancel() {
  editingId.value = null;
}
function save() {
  const firstText = props.columns.find((c) => c.editor !== "select");
  if (firstText && !String(draft[firstText.key] || "").trim()) {
    ui.toast("נא למלא את שדה החובה", "warning");
    return;
  }
  if (editingId.value === "new") {
    db.db[props.collection].push({ id: db.nextId(props.collection), ...JSON.parse(JSON.stringify(draft)) });
    ui.toast("הרשומה נוספה");
  } else {
    const row = db.db[props.collection].find((r) => r.id === editingId.value);
    if (row) Object.assign(row, JSON.parse(JSON.stringify(draft)));
    ui.toast("הרשומה עודכנה");
  }
  db.persist();
  editingId.value = null;
}
function confirmDelete() {
  db.db[props.collection] = db.db[props.collection].filter((r) => r.id !== deleteTarget.value.id);
  db.persist();
  deleteTarget.value = null;
  ui.toast("הרשומה נמחקה");
}
</script>

<template>
  <div>
    <PageHeader :title="title" :crumbs="crumbs">
      <template #actions>
        <button class="btn btn-primary" @click="ui.toast('השינויים נשמרו')">שמירה</button>
        <button class="btn btn-secondary" @click="$router.back()">ביטול</button>
      </template>
    </PageHeader>

    <div class="card">
      <div class="card-head">
        <button class="add-link" @click="startAdd">
          <span class="plus-disc"><AppIcon name="plus" :size="12" /></span>
          <span>{{ addLabel }}</span>
        </button>
        <SearchPill v-model="search" placeholder="חיפוש" />
      </div>

      <table class="crud-table">
        <thead>
          <tr>
            <th v-for="c in columns" :key="c.key">
              {{ c.label }} <AppIcon name="chevron-down" :size="12" />
            </th>
            <th class="th-act"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="editingId === 'new'" class="edit-row">
            <td v-for="(c, i) in columns" :key="c.key">
              <select v-if="c.editor === 'select'" v-model="draft[c.key]" class="cell-input">
                <option v-for="o in c.options" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <input
                v-else
                ref="firstInput"
                v-model="draft[c.key]"
                class="cell-input"
                :class="{ num: c.align === 'num' }"
                @keyup.enter="save"
                @keyup.esc="cancel"
              />
              <span v-if="i === 0" class="edit-actions">
                <button class="round ok" @click="save"><AppIcon name="check" :size="14" /></button>
                <button class="round" @click="cancel"><AppIcon name="cancel" :size="12" /></button>
              </span>
            </td>
            <td class="td-act"></td>
          </tr>
          <template v-for="row in rows" :key="row.id">
            <tr v-if="editingId === row.id" class="edit-row">
              <td v-for="(c, i) in columns" :key="c.key">
                <select v-if="c.editor === 'select'" v-model="draft[c.key]" class="cell-input">
                  <option v-for="o in c.options" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
                <input
                  v-else
                  ref="firstInput"
                  v-model="draft[c.key]"
                  class="cell-input"
                  :class="{ num: c.align === 'num' }"
                  @keyup.enter="save"
                  @keyup.esc="cancel"
                />
                <span v-if="i === 0" class="edit-actions">
                  <button class="round ok" @click="save"><AppIcon name="check" :size="14" /></button>
                  <button class="round" @click="cancel"><AppIcon name="cancel" :size="12" /></button>
                </span>
              </td>
              <td class="td-act"></td>
            </tr>
            <tr v-else class="row">
              <td v-for="c in columns" :key="c.key" :class="{ num: c.align === 'num' }">
                {{ displayValue(row, c) }}
              </td>
              <td class="td-act">
                <button class="icon-btn" title="עריכה" @click="startEdit(row)">
                  <AppIcon name="pencil" :size="15" />
                </button>
                <button class="icon-btn danger" title="מחיקה" @click="deleteTarget = row">
                  <AppIcon name="trash" :size="15" />
                </button>
              </td>
            </tr>
          </template>
          <tr v-if="!rows.length && editingId !== 'new'">
            <td :colspan="columns.length + 1" class="empty">{{ emptyText }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <DeleteConfirmModal
      v-if="deleteTarget"
      title="מחיקת רשומה"
      :message="`האם למחוק את &quot;${displayValue(deleteTarget, columns[0])}&quot;?`"
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
  margin-bottom: 16px;
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
.crud-table {
  width: 100%;
  max-width: 780px;
  border-collapse: collapse;
  margin-left: auto;
}
.crud-table th {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
  padding: 10px 14px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
}
.crud-table td {
  font-size: 13px;
  text-align: right;
  padding: 8px 14px;
  border-bottom: 1px solid var(--divider);
  height: 48px;
  color: var(--text-primary);
}
.row:hover {
  background: var(--surface-subtle);
}
.edit-row {
  background: var(--brand-primary-soft);
}
.cell-input {
  height: 34px;
  width: 100%;
  max-width: 260px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-input);
  padding: 0 10px;
  font-family: inherit;
  font-size: 13px;
  background: var(--surface);
  outline: none;
}
.cell-input:focus {
  border-color: var(--brand-primary);
}
.edit-actions {
  display: inline-flex;
  gap: 6px;
  margin-right: 8px;
  vertical-align: middle;
}
.round {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.round.ok {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.th-act,
.td-act {
  width: 84px;
  white-space: nowrap;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 3px;
}
.icon-btn.danger {
  color: var(--danger);
}
.empty {
  text-align: center;
  color: var(--text-muted);
  padding: 40px 0;
}
</style>
