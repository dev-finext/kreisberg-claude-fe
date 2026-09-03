<script setup>
import { ref, computed } from "vue";
import { useBoqStore } from "@/stores/boq";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { useDbStore } from "@/stores/db";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import PriorityControl from "./PriorityControl.vue";
import ItemRowPanel from "./ItemRowPanel.vue";
import ContextMenu from "@/components/shared/ContextMenu.vue";
import { formatQty } from "@/utils/format";
import { PRIORITY, SIDEBAR_MODE } from "@/constants";

const props = defineProps({
  mode: { type: String, required: true }, // 'assignment' | 'chapters'
});
const emit = defineEmits(["edit-item", "replace-item", "chapter-notes"]);

const boq = useBoqStore();
const cat = useCatalogStore();
const ui = useUiStore();
const db = useDbStore();

const editingQtyKey = ref(null);
const qtyDraft = ref("");
const pendingCascade = ref(null); // {sei, newQty, childSeis}
const dontAskAgain = ref(false);
const rowMenu = ref(null);

/* ---------------- rows + filtering ---------------- */
function applyFilters(rows) {
  const f = boq.filters;
  const term = boq.searchTerm.trim();
  return rows.filter((r) => {
    if (f.chapter?.length && !f.chapter.includes(String(r.item?.chapterId))) return false;
    if (f.subChapter?.length && !f.subChapter.includes(String(r.item?.subChapterId))) return false;
    if (f.itemName?.length && !f.itemName.includes(String(r.item?.id))) return false;
    if (f.resourceType?.length && !f.resourceType.includes(String(r.resourceTypeId))) return false;
    if (f.priority?.length && !f.priority.includes(r.priority)) return false;
    if (f.summary?.length && !f.summary.includes(String(r.forSummary))) return false;
    if (term && !(r.code.includes(term) || r.name.includes(term) || r.description.includes(term)))
      return false;
    // hidden alternatives: a non-chosen alternative whose group owner is present stays hidden
    return true;
  });
}

const assignment = computed(() => {
  const { editable, rows } = boq.assignmentRows;
  return { editable, rows: applyFilters(rows) };
});
const chapterGroups = computed(() => {
  const groups = boq.chaptersRows;
  return groups
    .map((g) => ({
      ...g,
      subGroups: g.subGroups
        .map((sg) => ({ ...sg, rows: applyFilters(sg.rows) }))
        .filter((sg) => sg.rows.length),
    }))
    .filter((g) => g.subGroups.length);
});

const selectedPath = computed(() =>
  boq.selectedElementId !== null ? boq.elementPath(boq.selectedElementId).join(" > ") : ""
);

const visibleRows = computed(() =>
  props.mode === SIDEBAR_MODE.ASSIGNMENT
    ? assignment.value.rows
    : chapterGroups.value.flatMap((g) => g.subGroups.flatMap((s) => s.rows))
);
const allChecked = computed(() => {
  const rows = visibleRows.value.filter((r) => r.sei);
  return rows.length > 0 && rows.every((r) => boq.checkedSeiIds.includes(r.sei.id));
});
function setAllChecked(v) {
  const ids = visibleRows.value.filter((r) => r.sei).map((r) => r.sei.id);
  boq.checkedSeiIds = v ? ids : [];
}
function rowChecked(r) {
  return r.sei ? boq.checkedSeiIds.includes(r.sei.id) : false;
}
function setRowChecked(r, v) {
  if (!r.sei) return;
  const i = boq.checkedSeiIds.indexOf(r.sei.id);
  if (v && i < 0) boq.checkedSeiIds.push(r.sei.id);
  if (!v && i >= 0) boq.checkedSeiIds.splice(i, 1);
}

/* ---------------- expansion ---------------- */
function isOpen(r) {
  return boq.openAllRows || boq.expandedRowKeys.includes(r.key);
}
function toggleOpen(r) {
  const i = boq.expandedRowKeys.indexOf(r.key);
  if (i >= 0) boq.expandedRowKeys.splice(i, 1);
  else boq.expandedRowKeys.push(r.key);
}

/* ---------------- quantity editing ---------------- */
function startEditQty(r) {
  if (!r.editable || props.mode === SIDEBAR_MODE.CHAPTERS) return;
  editingQtyKey.value = r.key;
  qtyDraft.value = String(r.qty);
}
function blockInvalidChars(e) {
  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
}
function commitQty(r) {
  if (editingQtyKey.value !== r.key) return;
  const raw = qtyDraft.value;
  editingQtyKey.value = null;
  const val = parseFloat(raw);
  if (isNaN(val) || val < 0) {
    ui.toast("כמות חייבת להיות מספר חיובי", "error");
    return;
  }
  if (val === r.qty) return;
  const prep = boq.prepareQtyUpdate(r.sei, val);
  if (prep.needsConfirm && !ui.prefs.skipLinkedQtyPrompt) {
    pendingCascade.value = { sei: r.sei, newQty: val, childSeis: prep.childSeis };
    dontAskAgain.value = false;
  } else {
    boq.applyQtyUpdate(r.sei, val, { cascade: prep.needsConfirm, childSeis: prep.childSeis });
    ui.toast("הכמות עודכנה בהצלחה");
  }
}
function confirmCascade(cascade) {
  const p = pendingCascade.value;
  if (dontAskAgain.value) ui.setPref("skipLinkedQtyPrompt", true);
  boq.applyQtyUpdate(p.sei, p.newQty, { cascade, childSeis: p.childSeis });
  ui.toast("הכמות עודכנה בהצלחה");
  pendingCascade.value = null;
}

/* ---------------- priority / summary ---------------- */
function onPriority(r, v) {
  boq.setPriority(r.item.id, v);
}
function onSummary(r, v) {
  const ok = boq.setForSummary(r.item.id, v);
  if (!ok)
    ui.toast(
      r.priority === PRIORITY.MANDATORY ? "סעיף חובה נכלל תמיד בסיכום" : "סעיף לא חובה אינו נכלל בסיכום",
      "warning"
    );
}
function summaryLocked(r) {
  return r.priority === PRIORITY.MANDATORY || r.priority === PRIORITY.OPTIONAL;
}

/* ---------------- row actions ---------------- */
function deleteRow(r) {
  boq.deleteSeis(r.seiIds);
  ui.toast("הסעיף הוסר");
}
function openRowMenu(r, e) {
  const rect = e.currentTarget.getBoundingClientRect();
  rowMenu.value = { row: r, x: rect.left - 160, y: rect.bottom + 4 };
}
const rowMenuItems = [
  { key: "edit", label: "עריכה", icon: "pencil" },
  { key: "replace", label: "החלפת סעיף", icon: "copy" },
];
function onRowMenu(key) {
  const r = rowMenu.value.row;
  rowMenu.value = null;
  if (key === "edit") emit("edit-item", r);
  if (key === "replace") emit("replace-item", r);
}

/* ---------------- chapter notes ---------------- */
function chapterNoteCount(chapterId) {
  return boq.commentsFor("chapter", chapterId).length;
}
function subChapterNoteCount(scId) {
  return boq.commentsFor("subChapter", scId).length;
}

const colCount = computed(() => (props.mode === SIDEBAR_MODE.ASSIGNMENT ? 9 : 8));
</script>

<template>
  <div class="items-table-wrap scroll-slim">
    <!-- selected structure path (שיוך) -->
    <div v-if="mode === SIDEBAR_MODE.ASSIGNMENT && selectedPath" class="selected-path">
      {{ selectedPath }}
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th class="th-check">
            <BaseCheckbox :model-value="allChecked" @update:model-value="setAllChecked" />
          </th>
          <th>{{ mode === SIDEBAR_MODE.ASSIGNMENT ? "מס' סעיף" : "מספר סעיף" }}</th>
          <th v-if="mode === SIDEBAR_MODE.ASSIGNMENT">שם סעיף</th>
          <th v-else>תיאור הסעיף</th>
          <th v-if="mode === SIDEBAR_MODE.ASSIGNMENT">סוג משאב</th>
          <th>יח' מידה</th>
          <th>כמות</th>
          <th>עדיפות</th>
          <th>לסיכום</th>
          <th class="th-actions"></th>
        </tr>
      </thead>

      <!-- ================= שיוך ================= -->
      <tbody v-if="mode === SIDEBAR_MODE.ASSIGNMENT">
        <template v-for="r in assignment.rows" :key="r.key">
          <tr class="item-row" :class="{ open: isOpen(r), checked: rowChecked(r) }">
            <td class="td-check">
              <span class="expand" @click="toggleOpen(r)">
                <AppIcon :name="isOpen(r) ? 'chevron-down' : 'chevron-left'" :size="16" />
              </span>
              <BaseCheckbox
                :model-value="rowChecked(r)"
                :disabled="!r.sei"
                @update:model-value="(v) => setRowChecked(r, v)"
              />
            </td>
            <td class="td-code">
              <span class="item-code">{{ r.code }}</span>
            </td>
            <td class="td-name ellipsis">{{ r.name }}</td>
            <td class="td-rt">{{ db.resourceTypes.find((t) => t.id === r.resourceTypeId)?.name || "--" }}</td>
            <td class="td-unit">{{ r.unit || "--" }}</td>
            <td class="td-qty">
              <input
                v-if="editingQtyKey === r.key"
                v-model="qtyDraft"
                type="number"
                class="qty-input editing num"
                autofocus
                @keydown="blockInvalidChars"
                @keyup.enter="commitQty(r)"
                @blur="commitQty(r)"
              />
              <button v-else-if="assignment.editable" class="qty-input num" @click="startEditQty(r)">
                {{ formatQty(r.qty) }}
              </button>
              <span v-else class="qty-text num">{{ formatQty(r.qty) }}</span>
            </td>
            <td class="td-prio">
              <PriorityControl :model-value="r.priority" @update:model-value="(v) => onPriority(r, v)" />
            </td>
            <td class="td-summary">
              <BaseToggle
                :model-value="r.forSummary"
                :disabled="summaryLocked(r)"
                @update:model-value="(v) => onSummary(r, v)"
              />
            </td>
            <td class="td-actions">
              <button v-if="r.sei" class="row-trash" title="הסרת סעיף" @click="deleteRow(r)">
                <AppIcon name="trash" :size="17" />
              </button>
              <button class="row-kebab" @click="openRowMenu(r, $event)">
                <AppIcon name="kebab" :size="16" />
              </button>
            </td>
          </tr>
          <tr v-if="isOpen(r)" class="panel-row">
            <td :colspan="colCount">
              <ItemRowPanel :row="r" @edit-item="emit('edit-item', r)" />
            </td>
          </tr>
        </template>
        <tr v-if="!assignment.rows.length">
          <td :colspan="colCount">
            <div class="table-empty">
              <p class="empty-title">עדיין אין כאן סעיפים</p>
              <p class="empty-sub">
                {{
                  boq.selectedElementId === null
                    ? "בחר מבנה מהרשימה כדי להציג סעיפים"
                    : "הם יופיעו כאן ברגע שיתווספו"
                }}
              </p>
            </div>
          </td>
        </tr>
      </tbody>

      <!-- ================= פרקים ================= -->
      <tbody v-else>
        <template v-for="g in chapterGroups" :key="g.chapter.id">
          <tr class="group-row chapter">
            <td :colspan="colCount">
              <div class="group-inner">
                <span class="group-label strong">פרק {{ g.chapter.num }} - {{ g.chapter.name }}</span>
                <span class="group-note">
                  <button
                    v-if="chapterNoteCount(g.chapter.id)"
                    class="note-glyph"
                    @click="emit('chapter-notes', { scope: 'chapter', ref: g.chapter })"
                  >
                    <AppIcon name="note" :size="17" />
                    <span class="note-count num">{{ chapterNoteCount(g.chapter.id) }}</span>
                  </button>
                  <button
                    v-else
                    class="btn-text"
                    @click="emit('chapter-notes', { scope: 'chapter', ref: g.chapter })"
                  >
                    הוספת הערה
                  </button>
                </span>
              </div>
            </td>
          </tr>
          <template v-for="sg in g.subGroups" :key="sg.subChapter.id">
            <tr class="group-row sub">
              <td :colspan="colCount">
                <div class="group-inner">
                  <span class="group-label">תת פרק {{ sg.subChapter.num }} - {{ sg.subChapter.name }}</span>
                  <span class="group-note">
                    <button
                      v-if="subChapterNoteCount(sg.subChapter.id)"
                      class="note-glyph"
                      @click="emit('chapter-notes', { scope: 'subChapter', ref: sg.subChapter })"
                    >
                      <AppIcon name="note" :size="17" />
                      <span class="note-count num">{{ subChapterNoteCount(sg.subChapter.id) }}</span>
                    </button>
                    <button
                      v-else
                      class="btn-text"
                      @click="emit('chapter-notes', { scope: 'subChapter', ref: sg.subChapter })"
                    >
                      הוספת הערה
                    </button>
                  </span>
                </div>
              </td>
            </tr>
            <template v-for="r in sg.rows" :key="r.key">
              <tr class="item-row" :class="{ open: isOpen(r), checked: rowChecked(r) }">
                <td class="td-check">
                  <span class="expand" @click="toggleOpen(r)">
                    <AppIcon :name="isOpen(r) ? 'chevron-down' : 'chevron-left'" :size="16" />
                  </span>
                  <BaseCheckbox
                    :model-value="rowChecked(r)"
                    :disabled="!r.sei"
                    @update:model-value="(v) => setRowChecked(r, v)"
                  />
                </td>
                <td class="td-code">
                  <span class="item-code">{{ r.code }}</span>
                </td>
                <td class="td-desc">
                  <div class="d-name ellipsis">{{ r.name }}</div>
                  <div class="d-text ellipsis">{{ r.description }}</div>
                </td>
                <td class="td-unit">{{ r.unit || "--" }}</td>
                <td class="td-qty">
                  <span class="qty-text num">{{ formatQty(r.qty) }}</span>
                </td>
                <td class="td-prio">
                  <PriorityControl :model-value="r.priority" @update:model-value="(v) => onPriority(r, v)" />
                </td>
                <td class="td-summary">
                  <BaseToggle
                    :model-value="r.forSummary"
                    :disabled="summaryLocked(r)"
                    @update:model-value="(v) => onSummary(r, v)"
                  />
                </td>
                <td class="td-actions">
                  <button class="row-kebab" @click="openRowMenu(r, $event)">
                    <AppIcon name="kebab" :size="16" />
                  </button>
                </td>
              </tr>
              <tr v-if="isOpen(r)" class="panel-row">
                <td :colspan="colCount">
                  <ItemRowPanel :row="r" @edit-item="emit('edit-item', r)" />
                </td>
              </tr>
            </template>
          </template>
        </template>
        <tr v-if="!chapterGroups.length">
          <td :colspan="colCount">
            <div class="table-empty">
              <p class="empty-title">עדיין אין כאן סעיפים</p>
              <p class="empty-sub">הם יופיעו כאן ברגע שיתווספו או יבחרו מהתפריט</p>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- linked-quantity confirmation -->
    <Teleport to="body">
      <div v-if="pendingCascade" class="cascade-overlay">
        <div class="cascade-modal">
          <h3 class="c-title">עדכון סעיפים מקושרים</h3>
          <p class="c-msg">
            לסעיף זה קיימים {{ pendingCascade.childSeis.length }} סעיפים מקושרים עם אותה יחידת מידה. לעדכן גם
            את הכמות שלהם?
          </p>
          <label class="c-dontask">
            <BaseCheckbox v-model="dontAskAgain" size="small" />
            <span>אל תציג הודעה זו שוב</span>
          </label>
          <div class="c-actions">
            <button class="btn btn-primary" @click="confirmCascade(true)">עדכן הכל</button>
            <button class="btn btn-secondary" @click="confirmCascade(false)">רק סעיף זה</button>
          </div>
        </div>
      </div>
    </Teleport>

    <ContextMenu
      v-if="rowMenu"
      :items="rowMenuItems"
      :x="rowMenu.x"
      :y="rowMenu.y"
      @select="onRowMenu"
      @close="rowMenu = null"
    />
  </div>
</template>

<style scoped>
.items-table-wrap {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.selected-path {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: right;
  padding: 4px 8px 10px;
}
.items-table {
  width: 100%;
  border-collapse: collapse;
}
.items-table th {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
  padding: 8px 10px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
  background: var(--surface-subtle);
  position: sticky;
  top: 0;
  z-index: 5;
}
.items-table td {
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
  padding: 6px 10px;
  border-bottom: 1px solid var(--divider);
  height: 48px;
}
.item-row:hover {
  background: var(--surface-subtle);
}
.item-row.open {
  background: var(--row-open-bg);
}
.item-row.checked {
  background: var(--brand-primary-soft);
}
.td-check {
  white-space: nowrap;
  width: 58px;
}
.expand {
  display: inline-flex;
  vertical-align: middle;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
}
.td-code {
  white-space: nowrap;
}
.td-name {
  max-width: 260px;
  font-weight: 500;
}
.td-desc {
  max-width: 340px;
}
.d-name {
  font-weight: 600;
}
.d-text {
  color: var(--text-secondary);
  font-size: 12px;
  max-width: 340px;
}
.qty-input {
  width: 64px;
  height: 30px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  font-size: 13px;
  text-align: center;
  font-family: inherit;
  color: var(--text-primary);
}
.qty-input.editing {
  border-color: var(--brand-primary);
  outline: none;
}
.qty-text {
  font-weight: 600;
}
.td-actions {
  width: 64px;
  white-space: nowrap;
}
.row-trash {
  background: none;
  border: none;
  color: var(--danger);
  opacity: 0;
  padding: 2px;
}
.row-kebab {
  background: none;
  border: none;
  color: var(--text-secondary);
  opacity: 0;
  padding: 2px;
}
.item-row:hover .row-trash,
.item-row:hover .row-kebab {
  opacity: 1;
}
.panel-row td {
  padding: 0 24px 14px;
  background: var(--row-open-bg);
}
/* group rows */
.group-row td {
  background: var(--surface-subtle);
  height: 38px;
  padding: 4px 10px;
}
.group-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.group-label {
  font-size: 13px;
}
.group-label.strong {
  font-weight: 700;
}
.group-row.sub .group-label {
  padding-right: 16px;
}
.note-glyph {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: var(--info-soft);
  color: var(--brand-primary);
  border: none;
  border-radius: 6px;
  padding: 3px 6px;
  position: relative;
}
.note-count {
  background: var(--brand-primary);
  color: #fff;
  font-size: 10px;
  border-radius: 999px;
  min-width: 15px;
  height: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}
.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 60px 0;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
}
.empty-sub {
  font-size: 14px;
  color: var(--text-muted);
}
/* cascade confirm */
.cascade-overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 44, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 70;
}
.cascade-modal {
  background: var(--surface);
  border-radius: 6px;
  padding: 24px 28px;
  width: 430px;
  box-shadow: var(--shadow-modal);
  text-align: right;
}
.c-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 10px;
}
.c-msg {
  font-size: 14px;
  margin-bottom: 14px;
}
.c-dontask {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 18px;
  cursor: pointer;
}
.c-actions {
  display: flex;
  gap: 12px;
  flex-direction: row-reverse;
  justify-content: flex-start;
}
</style>
