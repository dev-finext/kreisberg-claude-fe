<script setup>
import { ref, computed, nextTick } from "vue";
import { useBoqStore } from "@/stores/boq";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { useDbStore } from "@/stores/db";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import PriorityControl from "./PriorityControl.vue";
import ItemRowPanel from "./ItemRowPanel.vue";
import EmptyClipboard from "@/components/shared/EmptyClipboard.vue";
import ContextMenu from "@/components/shared/ContextMenu.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";
import { formatQty } from "@/utils/format";
import { stripHtml } from "@/utils/html";
import { PRIORITY, SIDEBAR_MODE } from "@/constants";

const props = defineProps({
  mode: { type: String, required: true }, // 'assignment' | 'chapters'
});
const emit = defineEmits(["edit-item", "replace-item", "chapter-notes", "add-items"]);

const boq = useBoqStore();
const cat = useCatalogStore();
const ui = useUiStore();
const db = useDbStore();

const editingQtyKey = ref(null);
const qtyDraft = ref("");
const pendingCascade = ref(null); // {sei, newQty, childSeis}
const dontAskAgain = ref(false);
const rowMenu = ref(null);

/* ---------------- composite sections ----------------
   Figma "כתבי כמויות סעיף מורכב": opening a composite row does not open the tab
   panel. In פרקים it reveals a 32px "פרטים" line (which opens the panel) followed
   by the sub-sections inline in the table; in שיוך it reveals the sub-sections
   only. A sub-section belongs to its parent, so it carries no לסיכום toggle. */
const openDetails = ref([]);
const openSubs = ref([]);
function isComposite(r) {
  return r.item?.type === "composite" && (r.item.subItems || []).length > 0;
}
function subRowsOf(r) {
  return (r.item.subItems || [])
    .map((si) => {
      const sub = cat.item(si.itemId);
      if (!sub) return null;
      return {
        key: `${r.key}|sub|${si.itemId}`,
        item: sub,
        sei: null,
        seiIds: [],
        qty: si.qty,
        editable: false,
        code: sub.code,
        name: sub.name,
        description: sub.description,
        unit: sub.unit,
        isComposite: false,
        priority: sub.priority || PRIORITY.RECOMMENDED,
        forSummary: true,
        resourceTypeId: sub.resourceTypeId,
      };
    })
    .filter(Boolean);
}
function detailsOpen(r) {
  return openDetails.value.includes(r.key);
}
function toggleDetails(r) {
  const i = openDetails.value.indexOf(r.key);
  if (i >= 0) openDetails.value.splice(i, 1);
  else openDetails.value.push(r.key);
}
function subOpen(key) {
  return openSubs.value.includes(key);
}
function toggleSub(key) {
  const i = openSubs.value.indexOf(key);
  if (i >= 0) openSubs.value.splice(i, 1);
  else openSubs.value.push(key);
}

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
    if (term && !(r.code.includes(term) || r.name.includes(term) || stripHtml(r.description).includes(term)))
      return false;
    // hidden alternatives: a non-chosen alternative whose group owner is present stays hidden
    return true;
  });
}

const assignment = computed(() => {
  const { editable, rows, belowRows } = boq.assignmentRows;
  return { editable, rows: applyFilters(rows), belowRows: applyFilters(belowRows) };
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
function isNewRow(r) {
  return boq.flashItemIds.includes(r.item?.id);
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

/* ---------------- quantity editing ----------------
   The qty cell is a plain always-on input: "0" is only a placeholder (so typing "5"
   gives 5, not 50), an existing value is selected on focus so typing replaces it,
   Tab / Shift+Tab and Enter / Shift+Enter hop straight to the next / previous row's qty. */
const tableWrap = ref(null);
function qtyInputs() {
  return [...(tableWrap.value?.querySelectorAll("input.qty-input") || [])];
}
function onQtyFocus(r, e) {
  if (!r.editable || props.mode === SIDEBAR_MODE.CHAPTERS) return;
  editingQtyKey.value = r.key;
  qtyDraft.value = r.qty ? String(r.qty) : "";
  nextTick(() => e.target.select());
}
function onQtyKeydown(e, r) {
  if (e.key === "Tab" || e.key === "Enter") {
    e.preventDefault();
    commitQty(r);
    const list = qtyInputs();
    const next = list[list.indexOf(e.target) + (e.shiftKey ? -1 : 1)];
    if (next) next.focus();
    else e.target.blur();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length === 1 && !/[\d.]/.test(e.key)) e.preventDefault();
  if (e.key === "." && e.target.value.includes(".")) e.preventDefault();
}
/** after adding items, land the caret in the first new row's qty so a typed number goes there */
function focusQtyForItems(itemIds) {
  nextTick(() => {
    const ids = new Set(itemIds.map(String));
    qtyInputs()
      .find((inp) => ids.has(inp.dataset.itemId))
      ?.focus();
  });
}
defineExpose({ focusQtyForItems });
function commitQty(r) {
  if (editingQtyKey.value !== r.key) return;
  const raw = qtyDraft.value.trim();
  editingQtyKey.value = null;
  const val = raw === "" ? 0 : parseFloat(raw);
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

/* the linked sections the cascade dialog is about to touch, named rather than counted */
const cascadeItems = computed(() =>
  (pendingCascade.value?.childSeis || [])
    .map((cs) => {
      const item = cat.item(cs.itemId);
      return item && { ...item, qty: cs.qty };
    })
    .filter(Boolean)
);

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
/* removing a row is not undoable, so it asks first */
const deleteRow = ref(null);
function confirmDeleteRow() {
  const r = deleteRow.value;
  deleteRow.value = null;
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
const belowLabel = computed(() =>
  boq.selectedElementId === 0 ? "כל הסעיפים בכתב הכמויות" : "סעיפים במבנים שמתחת"
);
</script>

<template>
  <div ref="tableWrap" class="items-table-wrap scroll-slim">
    <!-- selected structure path (שיוך) -->
    <div v-if="mode === SIDEBAR_MODE.ASSIGNMENT && selectedPath" class="selected-path">
      {{ selectedPath }}
    </div>

    <table class="items-table" :class="mode">
      <thead>
        <!-- Figma "Header Row": one column set for both views; only the first
             cell differs — a checkbox in שיוך, the row chevron in פרקים -->
        <tr>
          <th class="th-check">
            <BaseCheckbox
              v-if="mode === SIDEBAR_MODE.ASSIGNMENT"
              :model-value="allChecked"
              @update:model-value="setAllChecked"
            />
          </th>
          <th class="th-code">מס' סעיף</th>
          <th class="th-name">שם סעיף</th>
          <th class="th-rt">סוג משאב</th>
          <th class="th-unit">יח' מידה</th>
          <th class="th-qty">כמות</th>
          <th class="th-prio">עדיפות</th>
          <th class="th-summary">לסיכום</th>
          <th v-if="mode === SIDEBAR_MODE.ASSIGNMENT" class="th-actions"></th>
        </tr>
      </thead>

      <!-- ================= שיוך ================= -->
      <tbody v-if="mode === SIDEBAR_MODE.ASSIGNMENT">
        <template v-for="r in assignment.rows" :key="r.key">
          <tr
            class="item-row"
            :class="{ open: isOpen(r), checked: rowChecked(r), 'flash-new': isNewRow(r) }"
            :data-flash="`item:${r.item?.id}`"
          >
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
            <td v-full-title class="td-name ellipsis">{{ r.name }}</td>
            <td class="td-rt">{{ db.resourceTypes.find((t) => t.id === r.resourceTypeId)?.name || "--" }}</td>
            <td class="td-unit">{{ r.unit || "--" }}</td>
            <td class="td-qty">
              <input
                v-if="assignment.editable && r.editable"
                type="text"
                inputmode="decimal"
                class="qty-input num"
                :class="{ editing: editingQtyKey === r.key }"
                placeholder="0"
                :value="editingQtyKey === r.key ? qtyDraft : r.qty ? formatQty(r.qty) : ''"
                :data-item-id="r.item?.id"
                @focus="onQtyFocus(r, $event)"
                @input="qtyDraft = $event.target.value"
                @keydown="onQtyKeydown($event, r)"
                @blur="commitQty(r)"
              />
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
              <button v-if="r.sei" class="row-trash" title="הסרת סעיף" @click="deleteRow = r">
                <AppIcon name="trash" :size="17" />
              </button>
              <button class="row-kebab" @click="openRowMenu(r, $event)">
                <AppIcon name="kebab" :size="16" />
              </button>
            </td>
          </tr>
          <!-- composite: the sub-sections sit inline under their parent -->
          <tr
            v-for="sr in isOpen(r) && isComposite(r) ? subRowsOf(r) : []"
            :key="sr.key"
            class="item-row sub-item"
          >
            <td class="td-check">
              <BaseCheckbox :model-value="false" disabled />
            </td>
            <td class="td-code">
              <span class="item-code">{{ sr.code }}</span>
            </td>
            <td v-full-title class="td-name ellipsis">{{ sr.name }}</td>
            <td class="td-rt">
              {{ db.resourceTypes.find((t) => t.id === sr.resourceTypeId)?.name || "--" }}
            </td>
            <td class="td-unit">{{ sr.unit || "--" }}</td>
            <td class="td-qty">
              <span class="qty-text num">{{ formatQty(sr.qty) }}</span>
            </td>
            <td class="td-prio">
              <PriorityControl :model-value="sr.priority" disabled />
            </td>
            <td class="td-summary"></td>
            <td class="td-actions"></td>
          </tr>
          <tr v-if="isOpen(r) && !isComposite(r)" class="panel-row">
            <td :colspan="colCount">
              <ItemRowPanel :row="r" @edit-item="emit('edit-item', r)" />
            </td>
          </tr>
        </template>

        <!-- sections attached further down the structure, summed and read-only:
             they are edited where they hang, not from here -->
        <template v-if="assignment.belowRows.length">
          <tr class="group-row">
            <td :colspan="colCount">
              <div class="group-inner">
                <span class="group-label strong">{{ belowLabel }}</span>
              </div>
            </td>
          </tr>
          <tr v-for="r in assignment.belowRows" :key="r.key" class="item-row below-row">
            <td class="td-check">
              <BaseCheckbox :model-value="false" disabled />
            </td>
            <td class="td-code">
              <span class="item-code">{{ r.code }}</span>
            </td>
            <td v-full-title class="td-name ellipsis">{{ r.name }}</td>
            <td class="td-rt">{{ db.resourceTypes.find((t) => t.id === r.resourceTypeId)?.name || "--" }}</td>
            <td class="td-unit">{{ r.unit || "--" }}</td>
            <td class="td-qty">
              <span class="qty-text num">{{ formatQty(r.qty) }}</span>
            </td>
            <td class="td-prio">
              <PriorityControl :model-value="r.priority" disabled />
            </td>
            <td class="td-summary">
              <BaseToggle :model-value="r.forSummary" disabled />
            </td>
            <td class="td-actions"></td>
          </tr>
        </template>

        <tr v-if="!assignment.rows.length && !assignment.belowRows.length">
          <td :colspan="colCount">
            <div class="table-empty">
              <EmptyClipboard />
              <p class="empty-title">עדיין אין כאן סעיפים</p>
              <p class="empty-sub">
                {{
                  boq.selectedElementId === null
                    ? "בחר מבנה מהרשימה כדי להציג סעיפים"
                    : "הם יופיעו כאן ברגע שיתווספו"
                }}
              </p>
              <button
                v-if="boq.selectedElementId !== null && boq.selectedElementId !== 0"
                class="btn btn-primary empty-cta"
                @click="emit('add-items')"
              >
                הוספת סעיפים
              </button>
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
              <tr
                class="item-row"
                :class="{ open: isOpen(r), checked: rowChecked(r), 'flash-new': isNewRow(r) }"
                :data-flash="`item:${r.item?.id}`"
              >
                <td class="td-check">
                  <span class="expand" @click="toggleOpen(r)">
                    <AppIcon :name="isOpen(r) ? 'chevron-down' : 'chevron-left'" :size="16" />
                  </span>
                </td>
                <td class="td-code">
                  <span class="item-code">{{ r.code }}</span>
                </td>
                <td v-full-title class="td-name ellipsis">{{ r.name }}</td>
                <td class="td-rt">
                  {{ db.resourceTypes.find((t) => t.id === r.resourceTypeId)?.name || "--" }}
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
              </tr>
              <!-- composite: "פרטים" line, then the sub-sections inline -->
              <template v-if="isOpen(r) && isComposite(r)">
                <tr class="details-row">
                  <td class="td-check">
                    <span class="expand" @click="toggleDetails(r)">
                      <AppIcon :name="detailsOpen(r) ? 'chevron-down' : 'chevron-left'" :size="16" />
                    </span>
                  </td>
                  <td class="td-code"><span class="details-lbl">פרטים</span></td>
                  <td :colspan="colCount - 2"></td>
                </tr>
                <tr v-if="detailsOpen(r)" class="panel-row">
                  <td :colspan="colCount">
                    <ItemRowPanel :row="r" @edit-item="emit('edit-item', r)" />
                  </td>
                </tr>
                <template v-for="sr in subRowsOf(r)" :key="sr.key">
                  <tr class="item-row sub-item" :class="{ open: subOpen(sr.key) }">
                    <td class="td-check">
                      <span class="expand" @click="toggleSub(sr.key)">
                        <AppIcon :name="subOpen(sr.key) ? 'chevron-down' : 'chevron-left'" :size="16" />
                      </span>
                    </td>
                    <td class="td-code">
                      <span class="item-code">{{ sr.code }}</span>
                    </td>
                    <td v-full-title class="td-name ellipsis">{{ sr.name }}</td>
                    <td class="td-rt">
                      {{ db.resourceTypes.find((t) => t.id === sr.resourceTypeId)?.name || "--" }}
                    </td>
                    <td class="td-unit">{{ sr.unit || "--" }}</td>
                    <td class="td-qty">
                      <span class="qty-text num">{{ formatQty(sr.qty) }}</span>
                    </td>
                    <td class="td-prio">
                      <PriorityControl :model-value="sr.priority" disabled />
                    </td>
                    <td class="td-summary"></td>
                  </tr>
                  <tr v-if="subOpen(sr.key)" class="panel-row">
                    <td :colspan="colCount">
                      <ItemRowPanel :row="sr" nested @edit-item="emit('edit-item', sr)" />
                    </td>
                  </tr>
                </template>
              </template>
              <tr v-else-if="isOpen(r)" class="panel-row">
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
              <EmptyClipboard />
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
          <h3 class="c-title">עדכון סעיפים קשורים</h3>
          <p class="c-msg">
            לסעיף זה
            {{
              cascadeItems.length === 1 ? "קיים סעיף קשור אחד" : `קיימים ${cascadeItems.length} סעיפים קשורים`
            }}
            עם אותה יחידת מידה. לעדכן גם את הכמות שלהם ל-{{ formatQty(pendingCascade.newQty) }}?
          </p>
          <!-- which sections, by name, so the choice is made on the sections and not on a number -->
          <ul class="c-list scroll-slim">
            <li v-for="it in cascadeItems" :key="it.id" class="c-item">
              <div class="c-item-head">
                <span class="c-item-name">{{ it.name }}</span>
                <span class="c-item-code num">{{ it.code }}</span>
                <span class="c-item-unit">({{ it.unit }})</span>
              </div>
              <p v-if="stripHtml(it.description)" class="c-item-desc">{{ stripHtml(it.description) }}</p>
            </li>
          </ul>
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
    <DeleteConfirmModal
      v-if="deleteRow"
      title="הסרת סעיף"
      :message="`האם אתה בטוח שברצונך להסיר את &quot;${deleteRow.name}&quot; מכתב הכמויות?`"
      confirm-label="הסרה"
      @close="deleteRow = null"
      @confirm="confirmDeleteRow"
    />
  </div>
</template>

<style scoped>
.items-table-wrap {
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.items-table {
  min-width: 720px;
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
/* column widths from the Figma header row (917 wide) */
.th-check,
.td-check {
  white-space: nowrap;
  width: 36px;
  padding-right: 6px;
  padding-left: 0;
}
.items-table.assignment .th-check,
.items-table.assignment .td-check {
  width: 58px;
}
.th-code {
  width: 106px;
}
.th-rt {
  width: 108px;
}
.th-unit {
  width: 73px;
}
.th-qty {
  width: 74px;
}
.th-prio {
  width: 114px;
}
.th-summary {
  width: 68px;
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
  max-width: 338px;
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
  padding: 0 6px;
  outline: none;
}
.qty-input::placeholder {
  color: var(--text-muted);
}
.qty-input:focus,
.qty-input.editing {
  border-color: var(--brand-primary);
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
/* composite: 32px "פרטים" line between the parent row and its sub-sections */
.details-row td {
  height: 32px;
  padding: 0 12px;
  background: var(--row-open-bg);
  border-bottom: none;
}
.details-lbl {
  font-size: 14px;
  line-height: 18px;
  color: var(--text-primary);
}
/* a sub-section is part of its parent: no לסיכום toggle, no row actions */
.item-row.sub-item .td-summary,
.item-row.sub-item .td-actions {
  pointer-events: none;
}
/* group rows */
/* a summed line from somewhere else in the structure: readable, not editable */
.below-row td {
  color: var(--text-secondary);
}
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
.empty-cta {
  margin-top: 14px;
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
  margin-bottom: 12px;
}
.c-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 8px 12px;
  max-height: 180px;
  overflow-y: auto;
  background: var(--surface-subtle);
  border-radius: 6px;
}
.c-item + .c-item {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--divider);
}
.c-item-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
}
.c-item-name {
  font-weight: 600;
  color: var(--text-primary);
}
.c-item-code,
.c-item-unit {
  color: var(--text-secondary);
}
.c-item-desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 16px;
  color: var(--text-secondary);
  /* two lines is enough to recognise the section; the rest is in its own popup */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
