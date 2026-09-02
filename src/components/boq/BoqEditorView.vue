<script setup>
import { ref, computed, watch } from "vue";
import { useDbStore } from "@/stores/db";
import { useBoqStore } from "@/stores/boq";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import BoqSidebar from "./BoqSidebar.vue";
import BoqFilterRow from "./BoqFilterRow.vue";
import BoqItemsTable from "./BoqItemsTable.vue";
import ItemPickerModal from "./ItemPickerModal.vue";
import ItemEditModal from "./ItemEditModal.vue";
import ChapterNotesModal from "./ChapterNotesModal.vue";
import CreateBoqModal from "./CreateBoqModal.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";

const props = defineProps({
  boqId: { type: [Number, String], required: true },
});

const db = useDbStore();
const boq = useBoqStore();
const ui = useUiStore();

boq.openBoq(Number(props.boqId));
watch(
  () => props.boqId,
  (id) => boq.openBoq(Number(id))
);

const header = computed(() => boq.activeBoq);
const statusLabel = computed(
  () => ({ draft: "טיוטה", final: "סופי", locked: "נעול" })[header.value?.status] || "טיוטה"
);
const chips = computed(() => {
  const h = header.value;
  if (!h) return [];
  const out = [h.classification === "spec" ? "מפרט" : "תמחור"];
  const rt = db.resourceTypes.find((t) => t.id === h.resourceTypeId);
  if (rt) out.push(rt.name);
  const r = db.constructors.find((c) => c.id === h.resourceId);
  if (r) out.push(r.name);
  return out;
});

/* modals / dialogs */
const showPicker = ref(false);
const pickerMode = ref("multi");
const replaceContext = ref(null); // row being replaced
const editRow = ref(null);
const notesCtx = ref(null); // {scope, ref}
const showHeaderEdit = ref(false);
const deleteRowsConfirm = ref(false);
const relatedOffer = ref(null); // {selectedIds, related}
const scopeAsk = ref(null); // {itemIds}
const replaceScopeAsk = ref(null); // {oldItemId, newItemId}
const dontAskScope = ref(false);

/* toolbar enablement */
const selectedIsLeaf = computed(
  () => boq.selectedElementId !== null && boq.selectedElementId !== 0 && boq.isLeaf(boq.selectedElementId)
);
const addItemEnabled = computed(() =>
  boq.sidebarMode === "assignment" ? selectedIsLeaf.value : false
);
const hasChecked = computed(() => boq.checkedSeiIds.length > 0);
const pasteEnabled = computed(
  () =>
    ui.clipboard.seiIds.length > 0 &&
    boq.selectedElementId !== null &&
    boq.selectedElementId !== 0 &&
    boq.selectedElementId !== ui.clipboard.sourceElementId &&
    selectedIsLeaf.value
);

function openPicker() {
  if (!header.value?.catalogId) {
    ui.toast("לא נמצא קטלוג משויך", "error");
    return;
  }
  pickerMode.value = "multi";
  replaceContext.value = null;
  showPicker.value = true;
}

/* picker result → chained dialogs: related items, then scope */
function onPicked(itemIds) {
  showPicker.value = false;
  if (replaceContext.value) {
    replaceScopeAsk.value = { oldItemId: replaceContext.value.item.id, newItemId: itemIds[0] };
    replaceContext.value = null;
    return;
  }
  const related = boq.relatedItemsOf(itemIds);
  if (related.length) {
    relatedOffer.value = { selectedIds: itemIds, related };
  } else {
    askScope(itemIds);
  }
}
function resolveRelated(addRelated) {
  const { selectedIds, related } = relatedOffer.value;
  relatedOffer.value = null;
  const ids = addRelated ? [...selectedIds, ...related.map((r) => r.id)] : selectedIds;
  askScope(ids);
}
function askScope(itemIds) {
  if (ui.prefs.skipAddToAllStructuresPrompt) {
    finishAdd(itemIds, true);
  } else {
    dontAskScope.value = false;
    scopeAsk.value = { itemIds };
  }
}
function resolveScope(toAll) {
  const { itemIds } = scopeAsk.value;
  scopeAsk.value = null;
  if (dontAskScope.value) ui.setPref("skipAddToAllStructuresPrompt", true);
  finishAdd(itemIds, toAll);
}
function finishAdd(itemIds, toAll) {
  const n = boq.addItems(itemIds, { toAllElements: toAll });
  ui.toast(n ? "סעיפים נוספו בהצלחה" : "הסעיפים כבר קיימים במבנה");
}

/* replace item flow */
function startReplace(row) {
  replaceContext.value = row;
  pickerMode.value = "single";
  showPicker.value = true;
}
function resolveReplaceScope(scope) {
  const { oldItemId, newItemId } = replaceScopeAsk.value;
  replaceScopeAsk.value = null;
  const n = boq.replaceItem(oldItemId, newItemId, scope);
  ui.toast(`הסעיף הוחלף ב-${n} מבנים`);
}

function deleteChecked() {
  deleteRowsConfirm.value = false;
  const n = boq.checkedSeiIds.length;
  boq.deleteSeis([...boq.checkedSeiIds]);
  ui.toast(`${n} סעיפים הוסרו`);
}
</script>

<template>
  <div class="boq-editor">
    <!-- document bar: title side first (rightmost in RTL) -->
    <div class="doc-bar">
      <div class="doc-end">
        <h3 class="doc-title">{{ header?.name }}</h3>
        <template v-for="(c, i) in chips" :key="i">
          <span class="chip">{{ c }}</span>
          <span class="chip-dot" />
        </template>
        <span class="status-pill">{{ statusLabel }}</span>
        <button class="icon-btn" title="עריכת הגדרות" @click="showHeaderEdit = true">
          <AppIcon name="pencil" :size="18" />
        </button>
      </div>
      <div class="doc-start">
        <div class="search-pill">
          <input v-model="boq.searchTerm" placeholder="חיפוש לפי פרק/סעיף/תת סעיף" />
          <AppIcon name="search" :size="20" />
        </div>
        <span class="v-divider" />
        <div class="open-rows-toggle">
          <BaseToggle v-model="boq.openAllRows" />
          <span class="ort-label">תצוגת סעיפים פתוחים</span>
        </div>
        <span class="v-divider" />
        <!-- toolbar actions (שיוך) -->
        <div v-if="boq.sidebarMode === 'assignment'" class="actions">
          <button class="tb-btn" :disabled="!addItemEnabled" :title="addItemEnabled ? '' : 'ניתן להוסיף סעיפים רק לאלמנט קצה'" @click="openPicker">
            <AppIcon name="plus-circle" :size="20" />
            <span>סעיף</span>
          </button>
          <button class="tb-btn" disabled title="בקרוב">
            <AppIcon name="plus-circle" :size="20" />
            <span>תגית</span>
          </button>
          <button class="tb-btn" :disabled="!hasChecked" @click="deleteRowsConfirm = true">
            <AppIcon name="trash" :size="18" />
            <span>מחק</span>
          </button>
          <button class="tb-btn" :disabled="!pasteEnabled" @click="boq.pasteItems()">
            <AppIcon name="paste" :size="18" />
            <span>הדבק</span>
          </button>
          <button class="tb-btn" :disabled="!hasChecked" @click="boq.copyCheckedItems()">
            <AppIcon name="copy" :size="18" />
            <span>העתק</span>
          </button>
        </div>
      </div>
    </div>

    <div class="editor-body">
      <BoqSidebar />
      <div class="main-area">
        <BoqFilterRow />
        <BoqItemsTable
          :mode="boq.sidebarMode"
          @edit-item="(r) => (editRow = r)"
          @replace-item="startReplace"
          @chapter-notes="(ctx) => (notesCtx = ctx)"
        />
      </div>
    </div>

    <!-- modals -->
    <ItemPickerModal
      v-if="showPicker"
      :mode="pickerMode"
      :catalog-name="db.catalog.name"
      :already-selected="[...boq.itemIdsInBoq()]"
      @close="showPicker = false; replaceContext = null"
      @picked="onPicked"
    />
    <ItemEditModal v-if="editRow" :row="editRow" @close="editRow = null" />
    <ChapterNotesModal v-if="notesCtx" :scope="notesCtx.scope" :target="notesCtx.ref" @close="notesCtx = null" />
    <CreateBoqModal
      v-if="showHeaderEdit"
      :project-id="header?.projectId"
      :edit-header="header"
      @close="showHeaderEdit = false"
    />
    <DeleteConfirmModal
      v-if="deleteRowsConfirm"
      title="הסרת סעיפים"
      :message="`האם אתה בטוח שברצונך להסיר ${boq.checkedSeiIds.length} סעיפים מהמבנה?`"
      confirm-label="הסרה"
      @close="deleteRowsConfirm = false"
      @confirm="deleteChecked"
    />

    <!-- related items offer -->
    <Teleport to="body">
      <div v-if="relatedOffer" class="mini-overlay">
        <div class="mini-modal">
          <h3 class="m-title">סעיפים קשורים</h3>
          <p class="m-msg">לסעיפים שנבחרו קיימים {{ relatedOffer.related.length }} סעיפים קשורים בקטלוג. להוסיף גם אותם?</p>
          <ul class="m-list scroll-slim">
            <li v-for="r in relatedOffer.related" :key="r.id">
              <span class="item-code">{{ r.code }}</span> · {{ r.name }}
            </li>
          </ul>
          <div class="m-actions">
            <button class="btn btn-primary" @click="resolveRelated(true)">הוסף גם אותם</button>
            <button class="btn btn-secondary" @click="resolveRelated(false)">רק מה שבחרתי</button>
          </div>
        </div>
      </div>
      <!-- add-to-all-structures scope -->
      <div v-if="scopeAsk" class="mini-overlay">
        <div class="mini-modal">
          <h3 class="m-title">הוספת סעיפים</h3>
          <p class="m-msg">להוסיף את הסעיפים לכל המבנים?</p>
          <label class="m-dontask">
            <BaseCheckbox size="small" v-model="dontAskScope" />
            <span>אל תציג הודעה זו שוב</span>
          </label>
          <div class="m-actions">
            <button class="btn btn-primary" @click="resolveScope(true)">כן, לכל המבנים</button>
            <button class="btn btn-secondary" @click="resolveScope(false)">רק למבנה הנוכחי</button>
          </div>
        </div>
      </div>
      <!-- replace scope -->
      <div v-if="replaceScopeAsk" class="mini-overlay">
        <div class="mini-modal">
          <h3 class="m-title">החלפת סעיף</h3>
          <p class="m-msg">היכן להחליף את הסעיף? הכמות, העדיפות והלסיכום יישמרו.</p>
          <div class="m-actions column">
            <button class="btn btn-primary" @click="resolveReplaceScope('this')">במבנה זה</button>
            <button class="btn btn-secondary" :disabled="!boq.checkedLeafElementIds.length" @click="resolveReplaceScope('checked')">
              במבנים נבחרים
            </button>
            <button class="btn btn-secondary" @click="resolveReplaceScope('all')">בכל המבנים</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.boq-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 12px 16px 0 24px;
}
/* doc bar */
.doc-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  margin-bottom: 4px;
  gap: 12px;
  flex-wrap: wrap;
}
.doc-end {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row;
}
.doc-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
  order: 10;
}
.chip {
  font-size: 12px;
  color: var(--text-secondary);
}
.chip-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-disabled);
  display: inline-block;
}
.status-pill {
  border: 1px solid var(--text-extra-dark);
  background: rgba(97, 119, 143, 0.1);
  color: var(--text-extra-dark);
  height: 24px;
  padding: 0 12px;
  border-radius: 20px;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
  padding: 3px;
}
.doc-start {
  display: flex;
  align-items: center;
  gap: 12px;
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
.v-divider {
  width: 1px;
  height: 22px;
  background: var(--border-strong);
}
.open-rows-toggle {
  display: flex;
  align-items: center;
  gap: 9px;
}
.ort-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-direction: row-reverse;
}
.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-direction: row-reverse;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
  height: 40px;
}
.tb-btn:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}
/* body */
.editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
  border-top: 2px solid var(--divider);
}
.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 0 8px 8px;
}
/* mini modals */
.mini-overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 44, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 75;
}
.mini-modal {
  background: var(--surface);
  border-radius: 6px;
  box-shadow: var(--shadow-modal);
  width: 430px;
  padding: 24px 28px;
  text-align: right;
}
.m-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 10px;
}
.m-msg {
  font-size: 14px;
  margin-bottom: 12px;
}
.m-list {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  max-height: 140px;
  overflow-y: auto;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.m-dontask {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  cursor: pointer;
}
.m-actions {
  display: flex;
  gap: 12px;
  flex-direction: row-reverse;
  justify-content: flex-start;
}
.m-actions.column {
  flex-direction: column;
  align-items: stretch;
}
</style>
