<script setup>
import { ref, computed } from "vue";
import { useBoqStore } from "@/stores/boq";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { useDbStore } from "@/stores/db";
import AppIcon from "@/components/shared/AppIcon.vue";
import PriorityControl from "./PriorityControl.vue";
import { formatDateTime, formatQty } from "@/utils/format";
import { HISTORY_FIELD_LABELS, HISTORY_VALUE_LABELS } from "@/constants";

const props = defineProps({
  row: { type: Object, required: true },
  nested: { type: Boolean, default: false },
});
const emit = defineEmits(["edit-item"]);

const boq = useBoqStore();
const cat = useCatalogStore();
const ui = useUiStore();
const db = useDbStore();

const TABS = [
  { id: "desc", label: "תיאור" },
  { id: "notes", label: "הערות" },
  { id: "related", label: "סעיפים קשורים" },
  { id: "alternatives", label: "סעיפים חלופיים" },
  { id: "history", label: "הסטוריית סעיף" },
];
const activeTab = ref("desc");
const noteDraft = ref("");
const addingNote = ref(false);
const detailsOpen = ref(true);
const openSubItems = ref([]);

const item = computed(() => props.row.item);
const isComposite = computed(() => item.value?.type === "composite");

/* ---------- notes ---------- */
const notes = computed(() => boq.commentsFor("item", item.value.id));
function saveNote() {
  if (!noteDraft.value.trim()) {
    ui.toast("נא לכתוב הערה לפני השמירה", "warning");
    return;
  }
  boq.addComment("item", item.value.id, noteDraft.value.trim());
  noteDraft.value = "";
  addingNote.value = false;
}

/* ---------- related ---------- */
const parentItem = computed(() => (item.value.parentId ? cat.item(item.value.parentId) : null));
const childItems = computed(() => cat.childrenOf(item.value.id));
const relatedRows = computed(() => {
  const rows = [];
  if (parentItem.value) rows.push({ item: parentItem.value, isParent: true });
  for (const c of childItems.value) rows.push({ item: c, isParent: false });
  return rows;
});
function boqQtyOf(itemId) {
  return db.structureElementItems
    .filter((s) => s.boqId === boq.activeBoqId && s.itemId === itemId)
    .reduce((sum, s) => sum + s.qty, 0);
}

/* ---------- alternatives ---------- */
const alternatives = computed(() => boq.alternativesOf(item.value.id));
function chooseAlt(altId) {
  boq.chooseAlternative(item.value.id, altId);
  ui.toast("הסעיף החלופי נבחר — הכמות הועברה");
}

/* ---------- history ---------- */
const history = computed(() => boq.historyFor(item.value.id));
function fmtVal(field, v) {
  return HISTORY_VALUE_LABELS[v] || v;
}

/* ---------- composite sub items ---------- */
const subItems = computed(() =>
  (item.value.subItems || [])
    .map((si) => {
      const sub = cat.item(si.itemId);
      return sub ? { ...si, item: sub } : null;
    })
    .filter(Boolean)
);
function toggleSubOpen(id) {
  const i = openSubItems.value.indexOf(id);
  if (i >= 0) openSubItems.value.splice(i, 1);
  else openSubItems.value.push(id);
}
function subRow(si) {
  return {
    key: `sub-${si.itemId}`,
    item: si.item,
    sei: null,
    seiIds: [],
    qty: si.qty,
    editable: false,
    code: si.item.code,
    name: si.item.name,
    description: si.item.description,
    unit: si.item.unit,
    isComposite: false,
    priority: si.item.priority || "recommended",
    forSummary: true,
    resourceTypeId: si.item.resourceTypeId,
  };
}
</script>

<template>
  <div class="row-panel" :class="{ nested }">
    <div class="panel-tabs">
      <button class="panel-pencil" title="עריכת סעיף" @click="emit('edit-item')">
        <AppIcon name="pencil" :size="18" />
      </button>
      <div class="tabs-inner">
        <button
          v-for="t in TABS"
          :key="t.id"
          class="p-tab"
          :class="{ active: activeTab === t.id }"
          @click="activeTab = t.id"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- תיאור -->
    <div v-if="activeTab === 'desc'" class="p-body desc scroll-slim">
      <p class="desc-text">{{ row.description || item.description || "אין תיאור לסעיף זה" }}</p>
    </div>

    <!-- הערות -->
    <div v-else-if="activeTab === 'notes'" class="p-body">
      <div class="notes-head">
        <button class="btn-text add-note" @click="addingNote = !addingNote">
          <AppIcon name="plus-circle" :size="18" />
          <span>הוספת הערה</span>
        </button>
      </div>
      <div v-if="addingNote" class="note-editor">
        <textarea v-model="noteDraft" class="input note-input" rows="2" placeholder="כתוב הערה..." />
        <div class="note-actions">
          <button class="btn btn-primary btn-sm" @click="saveNote">שמירה</button>
          <button
            class="btn btn-secondary btn-sm"
            @click="
              addingNote = false;
              noteDraft = '';
            "
          >
            ביטול
          </button>
        </div>
      </div>
      <div v-if="notes.length" class="notes-stack scroll-slim">
        <div v-for="n in notes" :key="n.id" class="note-card">
          <div class="note-meta">
            <span class="note-author">{{ n.author }}</span>
            <span class="note-ts num">{{ formatDateTime(n.ts) }}</span>
          </div>
          <p class="note-text">{{ n.text }}</p>
        </div>
      </div>
      <p v-else-if="!addingNote" class="p-empty">אין הערות לסעיף זה</p>
    </div>

    <!-- סעיפים קשורים (read-only: parent + direct children only) -->
    <div v-else-if="activeTab === 'related'" class="p-body">
      <table v-if="relatedRows.length" class="nested-table">
        <thead v-if="relatedRows.length >= 3">
          <tr>
            <th>מס' סעיף</th>
            <th>שם סעיף</th>
            <th>סוג משאב</th>
            <th>יח' מידה</th>
            <th>כמות</th>
            <th>סעיף ראשי</th>
            <th>עדיפות</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="rr in relatedRows"
            :key="rr.item.id"
            class="nested-row clickable"
            @click="emit('edit-item')"
          >
            <td>
              <span class="item-code">{{ rr.item.code }}</span
              ><span v-if="rr.isParent" class="parent-badge" title="סעיף אב" />
            </td>
            <td class="ellipsis">{{ rr.item.name }}</td>
            <td>{{ db.resourceTypes.find((t) => t.id === rr.item.resourceTypeId)?.name || "--" }}</td>
            <td>{{ rr.item.unit || "--" }}</td>
            <td class="num">{{ formatQty(boqQtyOf(rr.item.id)) }}</td>
            <td>{{ rr.isParent ? "כן" : "" }}</td>
            <td><PriorityControl variant="squares" :model-value="rr.item.priority || 'recommended'" /></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="p-empty">אין סעיפים קשורים לסעיף זה</p>
    </div>

    <!-- סעיפים חלופיים (radio; exactly one chosen) -->
    <div v-else-if="activeTab === 'alternatives'" class="p-body">
      <table v-if="alternatives.length" class="nested-table">
        <thead v-if="alternatives.length >= 2">
          <tr>
            <th class="th-radio"></th>
            <th>מס' סעיף</th>
            <th>שם סעיף</th>
            <th>יח' מידה</th>
            <th>כמות</th>
            <th>עדיפות</th>
          </tr>
        </thead>
        <tbody>
          <tr class="nested-row current">
            <td class="td-radio"><span class="radio checked" /></td>
            <td>
              <span class="item-code">{{ item.code }}</span>
            </td>
            <td class="ellipsis">{{ item.name }} <span class="current-tag">(נוכחי)</span></td>
            <td>{{ item.unit || "--" }}</td>
            <td class="num">{{ formatQty(row.qty) }}</td>
            <td><PriorityControl variant="squares" :model-value="row.priority" /></td>
          </tr>
          <tr v-for="alt in alternatives" :key="alt.id" class="nested-row">
            <td class="td-radio"><button class="radio" @click="chooseAlt(alt.id)" /></td>
            <td>
              <span class="item-code">{{ alt.code }}</span>
            </td>
            <td class="ellipsis">{{ alt.name }}</td>
            <td>{{ alt.unit || "--" }}</td>
            <td class="num">—</td>
            <td><PriorityControl variant="squares" :model-value="alt.priority || 'recommended'" /></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="p-empty">לא הוגדרו סעיפים חלופיים בקטלוג לסעיף זה</p>
    </div>

    <!-- הסטוריית סעיף -->
    <div v-else-if="activeTab === 'history'" class="p-body">
      <div v-if="history.length" class="history-stack scroll-slim">
        <div v-for="h in history" :key="h.id" class="history-group">
          <div class="h-head">
            <AppIcon name="clock" :size="15" />
            <span class="num">{{ formatDateTime(h.ts) }}</span>
            <span>, {{ h.user }}</span>
          </div>
          <div class="h-card">
            <span v-for="(c, i) in h.changes" :key="i" class="h-change">
              <span class="h-field">{{ HISTORY_FIELD_LABELS[c.field] || c.field }}:</span>
              <span class="h-old">{{ fmtVal(c.field, c.from) }}</span>
              <span class="h-new">{{ fmtVal(c.field, c.to) }}</span>
            </span>
          </div>
        </div>
      </div>
      <p v-else class="p-empty">אין עדיין שינויים מתועדים לסעיף זה</p>
    </div>

    <!-- composite: פרטים disclosure + sub items -->
    <div v-if="isComposite && !nested" class="composite-details">
      <button class="details-toggle" @click="detailsOpen = !detailsOpen">
        <AppIcon :name="detailsOpen ? 'chevron-down' : 'chevron-left'" :size="15" />
        <span>פרטים</span>
      </button>
      <table v-if="detailsOpen" class="nested-table sub-items">
        <tbody>
          <template v-for="si in subItems" :key="si.itemId">
            <tr class="nested-row">
              <td class="td-expand">
                <span class="expand" @click="toggleSubOpen(si.itemId)">
                  <AppIcon
                    :name="openSubItems.includes(si.itemId) ? 'chevron-down' : 'chevron-left'"
                    :size="14"
                  />
                </span>
              </td>
              <td>
                <span class="item-code">{{ si.item.code }}</span>
              </td>
              <td class="ellipsis">{{ si.item.name }}</td>
              <td>
                {{ db.resourceTypes.find((t) => t.id === si.item.resourceTypeId)?.name || "קבלן ראשי" }}
              </td>
              <td>{{ si.item.unit }}</td>
              <td class="num">{{ formatQty(si.qty, 0) }}</td>
              <td><PriorityControl variant="squares" :model-value="si.item.priority || 'recommended'" /></td>
            </tr>
            <tr v-if="openSubItems.includes(si.itemId)" class="sub-panel-row">
              <td colspan="7">
                <ItemRowPanel :row="subRow(si)" nested @edit-item="emit('edit-item')" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.row-panel {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-nested);
  padding: 10px 16px 14px;
  text-align: right;
}
.row-panel.nested {
  margin: 6px 0;
}
.panel-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  border-bottom: 1.5px solid var(--divider);
  margin-bottom: 10px;
}
.tabs-inner {
  display: flex;
}
.p-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1.5px;
  padding: 7px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  font-family: inherit;
}
.p-tab.active {
  color: var(--brand-primary);
  border-bottom-color: var(--brand-primary);
  font-weight: 600;
}
.panel-pencil {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 4px;
}
.p-body {
  min-height: 48px;
}
.desc {
  max-height: 132px;
  overflow-y: auto;
}
.desc-text {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-line;
  color: var(--text-primary);
}
.p-empty {
  font-size: 13px;
  color: var(--text-muted);
  padding: 12px 0;
}
/* notes */
.notes-head {
  display: flex;
  justify-content: flex-end;
  flex-direction: row-reverse;
  margin-bottom: 8px;
}
.add-note {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-direction: row-reverse;
  font-weight: 600;
}
.note-editor {
  margin-bottom: 10px;
}
.note-input {
  height: auto;
  padding: 8px 10px;
  resize: vertical;
}
.note-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  flex-direction: row-reverse;
  justify-content: flex-start;
}
.btn-sm {
  height: 30px;
  min-width: 70px;
  padding: 0 14px;
  font-size: 12px;
}
.notes-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
}
.note-card {
  background: var(--surface-muted);
  border-radius: 8px;
  padding: 8px 12px;
}
.note-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 3px;
}
.note-author {
  font-weight: 600;
}
.note-text {
  font-size: 13px;
}
/* nested tables */
.nested-table {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-nested);
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
}
.nested-table th {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
  padding: 6px 10px;
  border-bottom: 1px solid var(--divider);
  background: var(--surface-subtle);
}
.nested-table td {
  font-size: 13px;
  text-align: right;
  padding: 5px 10px;
  height: var(--row-h-nested);
  border-bottom: 1px solid var(--divider);
}
.nested-table tr:last-child td {
  border-bottom: none;
}
.nested-row.clickable {
  cursor: pointer;
}
.nested-row.clickable:hover {
  background: var(--surface-subtle);
}
.parent-badge {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--warning);
  margin-right: 6px;
}
/* alternatives */
.td-radio,
.th-radio {
  width: 34px;
}
.radio {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1.5px solid var(--border-strong);
  background: var(--surface);
  display: inline-block;
  padding: 0;
  cursor: pointer;
}
.radio.checked {
  border-color: var(--brand-primary);
  box-shadow:
    inset 0 0 0 3.5px var(--surface),
    inset 0 0 0 10px var(--brand-primary);
}
.current-tag {
  color: var(--text-muted);
  font-size: 11px;
}
.nested-row.current {
  background: var(--brand-primary-soft);
}
/* history */
.history-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 260px;
  overflow-y: auto;
}
.h-head {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
  flex-direction: row-reverse;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.h-card {
  background: var(--history-card-bg);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.h-change {
  font-size: 13px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.h-field {
  color: var(--text-secondary);
  font-size: 12px;
}
.h-old {
  text-decoration: line-through;
  color: var(--text-muted);
}
.h-new {
  font-weight: 600;
}
/* composite */
.composite-details {
  margin-top: 12px;
}
.details-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-direction: row-reverse;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.td-expand {
  width: 30px;
}
.expand {
  cursor: pointer;
  color: var(--text-secondary);
  display: inline-flex;
}
.sub-panel-row td {
  background: var(--surface-subtle);
  padding: 4px 12px;
}
</style>
