<script setup>
import { computed, nextTick, ref } from "vue";
import { useRoute } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";

const route = useRoute();
const db = useDbStore();
const ui = useUiStore();

const projectId = computed(() => Number(route.params.id));
const conditions = computed(() => db.conditions.filter((c) => c.projectId === projectId.value));

const creating = ref(false);
const editingId = ref(null);
const draft = ref("");
const deleteTarget = ref(null);
let editInput = null;

/* newest condition on top, like the Figma frame; the pending new row is topmost */
const rows = computed(() => {
  const list = conditions.value.map((c, i) => ({ key: c.id, condition: c, number: i + 1 }));
  list.reverse();
  if (creating.value) {
    list.unshift({ key: "new", condition: null, number: conditions.value.length + 1 });
  }
  return list;
});

function isEditing(row) {
  return row.condition ? editingId.value === row.condition.id : true;
}
function setEditInput(el) {
  if (el) editInput = el;
}
function focusInput() {
  nextTick(() => editInput?.focus());
}
function createNew() {
  if (creating.value) {
    focusInput();
    return;
  }
  editingId.value = null;
  draft.value = "";
  creating.value = true;
  focusInput();
}
function beginEdit(condition) {
  creating.value = false;
  editingId.value = condition.id;
  draft.value = condition.text;
  focusInput();
}
function cancelEdit() {
  creating.value = false;
  editingId.value = null;
  draft.value = "";
}
function saveEdit() {
  const text = draft.value.trim();
  if (!text) {
    ui.toast("נא להזין תוכן לתנאי", "warning");
    focusInput();
    return;
  }
  if (creating.value) {
    db.db.conditions.push({ id: db.nextId("conditions"), projectId: projectId.value, text });
    ui.toast("התנאי נוסף");
  } else {
    const c = db.db.conditions.find((x) => x.id === editingId.value);
    if (c) c.text = text;
    ui.toast("התנאי עודכן");
  }
  db.persist();
  cancelEdit();
}
function confirmDelete() {
  const idx = db.db.conditions.findIndex((c) => c.id === deleteTarget.value.id);
  if (idx !== -1) db.db.conditions.splice(idx, 1);
  db.persist();
  ui.toast("התנאי נמחק");
  deleteTarget.value = null;
}
</script>

<template>
  <div class="conditions-tab">
    <div class="cond-head">
      <h3 class="tab-title">תנאים מיוחדים</h3>
      <button class="ghost-btn" @click="createNew">
        <span class="plus-disc"><AppIcon name="plus" :size="12" /></span>
        <span>צור תנאי חדש</span>
      </button>
    </div>

    <div v-for="row in rows" :key="row.key" class="cond">
      <label class="cond-label">
        תנאי <span class="num">{{ row.number }}</span>
      </label>

      <!-- edit mode -->
      <div v-if="isEditing(row)" class="cond-row">
        <div class="cond-box editing">
          <input
            :ref="setEditInput"
            v-model="draft"
            class="cond-input"
            placeholder="הזן תנאי"
            @keyup.enter="saveEdit"
            @keyup.esc="cancelEdit"
          />
          <AppIcon name="pencil" :size="16" class="cond-pencil" />
        </div>
        <button class="round-btn save" title="שמירה" @click="saveEdit">
          <AppIcon name="check" :size="15" />
        </button>
        <button class="round-btn cancel" title="ביטול" @click="cancelEdit">
          <AppIcon name="cancel" :size="13" />
        </button>
      </div>

      <!-- read mode -->
      <div v-else class="cond-row">
        <button class="cond-box read" @click="beginEdit(row.condition)">
          <span class="cond-text" :class="{ placeholder: !row.condition.text }">
            {{ row.condition.text || "הזן תנאי" }}
          </span>
          <AppIcon name="pencil" :size="16" class="cond-pencil" />
        </button>
        <button class="trash-btn" title="מחיקת תנאי" @click="deleteTarget = row.condition">
          <AppIcon name="trash" :size="20" />
        </button>
      </div>
    </div>

    <DeleteConfirmModal
      v-if="deleteTarget"
      title="מחיקת תנאי"
      message="האם אתה בטוח שברצונך למחוק את התנאי?"
      :detail="deleteTarget.text"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.conditions-tab {
  padding: 30px 40px 40px;
}
.cond-head {
  width: 420px;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}
.tab-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: none;
  padding: 0;
  color: var(--brand-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.ghost-btn:hover {
  color: var(--brand-primary-hover);
}
.plus-disc {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.ghost-btn:hover .plus-disc {
  background: var(--brand-primary-hover);
}
.cond {
  margin-bottom: 22px;
}
.cond-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  text-align: right;
}
.cond-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cond-box {
  position: relative;
  flex: 0 0 420px;
  max-width: 420px;
  height: var(--input-h);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  display: flex;
  align-items: center;
  padding: 0 14px 0 42px;
}
.cond-box.read {
  font-family: inherit;
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
  cursor: pointer;
}
.cond-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cond-text.placeholder {
  color: var(--text-muted);
}
.cond-box.editing {
  border: 1.5px solid var(--status-purple);
  padding: 0;
}
.cond-input {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  background: none;
  border-radius: 8px;
  padding: 0 14px 0 42px;
  font-family: inherit;
  font-size: 14px;
  color: var(--text-primary);
}
.cond-input::placeholder {
  color: var(--text-muted);
}
.cond-pencil {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}
.round-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  cursor: pointer;
}
.round-btn.save {
  background: var(--brand-primary);
  border: none;
  color: #fff;
}
.round-btn.save:hover {
  background: var(--brand-primary-hover);
}
.round-btn.cancel {
  background: var(--surface);
  border: 1.5px solid var(--text-extra-dark);
  color: var(--text-extra-dark);
}
.round-btn.cancel:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
}
.trash-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-primary);
  opacity: 0;
  transition: opacity 0.15s;
}
.cond-row:hover .trash-btn,
.trash-btn:focus-visible {
  opacity: 1;
}
</style>
