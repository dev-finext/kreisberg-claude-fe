<script setup>
import { ref, computed } from "vue";
import { useBoqStore } from "@/stores/boq";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import ContextMenu from "@/components/shared/ContextMenu.vue";
import StructureTreeRow from "./StructureTreeRow.vue";
import StructureElementModal from "./StructureElementModal.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";
import { SIDEBAR_MODE } from "@/constants";

const boq = useBoqStore();
const ui = useUiStore();

const renamingId = ref(null);
const menu = ref(null); // {node, x, y}
const addMenu = ref(null); // {x, y}
const elementModal = ref(null); // {mode, refElement}
const deleteTarget = ref(null);

const tree = computed(() => boq.elementTree);
const rootSelected = computed(() => boq.selectedElementId === 0);
const rootExpanded = ref(true);

/* ---------- שיוך: add flow ---------- */
function openAddMenu(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  if (!boq.selectedElement) {
    if (!tree.value.length) {
      elementModal.value = { mode: "brother", refElement: null };
    } else {
      ui.toast("אנא בחר מבנה מהרשימה", "warning");
    }
    return;
  }
  addMenu.value = { x: rect.left, y: rect.bottom + 4 };
}
function onAddSelect(key) {
  addMenu.value = null;
  elementModal.value = { mode: key, refElement: boq.selectedElement };
}
function saveElement(data) {
  const m = elementModal.value;
  if (m.mode === "edit") {
    boq.updateElement(m.refElement.id, data);
    ui.toast("המבנה עודכן בהצלחה");
  } else {
    const parentId = m.mode === "son" ? m.refElement.id : m.refElement ? m.refElement.parentId : null;
    boq.addElement({ ...data, parentId });
    ui.toast("המבנה נוסף בהצלחה");
  }
  elementModal.value = null;
}

/* ---------- kebab ---------- */
function openKebab({ node, event }) {
  const rect = event.currentTarget.getBoundingClientRect();
  menu.value = { node, x: rect.left - 150, y: rect.bottom + 4 };
}
const kebabItems = [
  { key: "edit", label: "עריכה", icon: "pencil" },
  { key: "duplicate", label: "שכפול", icon: "copy" },
  { key: "delete", label: "מחיקה", icon: "trash", danger: true },
];
function onKebabSelect(key) {
  const node = menu.value.node;
  menu.value = null;
  if (key === "edit") {
    renamingId.value = node.id;
  } else if (key === "duplicate") {
    const copy = boq.duplicateElement(node.id);
    if (copy) ui.toast(`המבנה שוכפל: ${copy.name}`);
  } else if (key === "delete") {
    deleteTarget.value = node;
  }
}
function confirmDelete() {
  boq.deleteElement(deleteTarget.value.id);
  ui.toast("המבנה נמחק");
  deleteTarget.value = null;
}

/* ---------- פרקים: cascade checks ---------- */
const usedTree = computed(() => boq.usedChaptersTree);
const allChecked = computed(() => {
  const allSubs = usedTree.value.flatMap((g) => g.subChapters.map((s) => s.id));
  return allSubs.length > 0 && allSubs.every((id) => boq.checkedSubChapterIds.includes(id));
});
function setAll(v) {
  boq.checkedSubChapterIds = v ? usedTree.value.flatMap((g) => g.subChapters.map((s) => s.id)) : [];
  boq.checkedChapterIds = v ? usedTree.value.map((g) => g.chapter.id) : [];
}
function chapterChecked(g) {
  return g.subChapters.every((s) => boq.checkedSubChapterIds.includes(s.id));
}
function setChapter(g, v) {
  const subIds = g.subChapters.map((s) => s.id);
  boq.checkedSubChapterIds = v
    ? [...new Set([...boq.checkedSubChapterIds, ...subIds])]
    : boq.checkedSubChapterIds.filter((id) => !subIds.includes(id));
  boq.checkedChapterIds = v
    ? [...new Set([...boq.checkedChapterIds, g.chapter.id])]
    : boq.checkedChapterIds.filter((id) => id !== g.chapter.id);
}
function subChecked(sc) {
  return boq.checkedSubChapterIds.includes(sc.id);
}
function setSub(g, sc, v) {
  boq.checkedSubChapterIds = v
    ? [...boq.checkedSubChapterIds, sc.id]
    : boq.checkedSubChapterIds.filter((id) => id !== sc.id);
  // auto-check chapter when all its subs are checked
  const all = g.subChapters.every((s) => boq.checkedSubChapterIds.includes(s.id));
  boq.checkedChapterIds = all
    ? [...new Set([...boq.checkedChapterIds, g.chapter.id])]
    : boq.checkedChapterIds.filter((id) => id !== g.chapter.id);
}
function toggleChapterExpand(chId) {
  const i = boq.expandedChapterIds.indexOf(chId);
  if (i >= 0) boq.expandedChapterIds.splice(i, 1);
  else boq.expandedChapterIds.push(chId);
}
</script>

<template>
  <aside class="boq-sidebar">
    <!-- segmented control: right = שיוך, left = פרקים; selected half gets the light-blue fill -->
    <div class="side-tabs">
      <button
        class="side-tab"
        :class="{ active: boq.sidebarMode === SIDEBAR_MODE.CHAPTERS }"
        @click="boq.setMode(SIDEBAR_MODE.CHAPTERS)"
      >
        <span class="side-tab-inner" :class="{ active: boq.sidebarMode === SIDEBAR_MODE.CHAPTERS }"
          >פרקים</span
        >
      </button>
      <button
        class="side-tab"
        :class="{ active: boq.sidebarMode === SIDEBAR_MODE.ASSIGNMENT }"
        @click="boq.setMode(SIDEBAR_MODE.ASSIGNMENT)"
      >
        <span class="side-tab-inner" :class="{ active: boq.sidebarMode === SIDEBAR_MODE.ASSIGNMENT }"
          >שיוך</span
        >
      </button>
    </div>

    <!-- ================= שיוך ================= -->
    <template v-if="boq.sidebarMode === SIDEBAR_MODE.ASSIGNMENT">
      <div class="add-row">
        <button class="ghost-btn" @click="openAddMenu">
          <span>הוספה</span>
          <AppIcon name="plus-circle" :size="20" />
        </button>
      </div>
      <div class="tree scroll-slim">
        <!-- root: הכל -->
        <div class="tree-root-row" :class="{ selected: rootSelected }" @click="boq.selectElement(0)">
          <span class="chevron" @click.stop="rootExpanded = !rootExpanded">
            <AppIcon :name="rootExpanded ? 'chevron-down' : 'chevron-left'" :size="16" />
          </span>
          <span class="root-label">הכל</span>
          <span class="spacer" />
          <span class="eye"><AppIcon name="eye" :size="18" /></span>
        </div>
        <template v-if="rootExpanded">
          <StructureTreeRow
            v-for="node in tree"
            :key="node.id"
            :node="node"
            :depth="1"
            :renaming-id="renamingId"
            @kebab="openKebab"
            @rename-done="renamingId = null"
            @request-rename="renamingId = $event"
          />
        </template>
      </div>
    </template>

    <!-- ================= פרקים ================= -->
    <template v-else>
      <div class="chapters-tree scroll-slim">
        <div class="select-all-row">
          <BaseCheckbox size="small" :model-value="allChecked" @update:model-value="setAll" />
          <span class="select-all-label">בחר הכל</span>
        </div>
        <div class="chapters-divider" />
        <div v-for="g in usedTree" :key="g.chapter.id" class="chapter-group">
          <div class="chapter-row" :class="{ checked: chapterChecked(g) }">
            <span class="chevron" @click.stop="toggleChapterExpand(g.chapter.id)">
              <AppIcon
                :name="boq.expandedChapterIds.includes(g.chapter.id) ? 'chevron-down' : 'chevron-left'"
                :size="16"
              />
            </span>
            <BaseCheckbox
              size="small"
              :model-value="chapterChecked(g)"
              @update:model-value="(v) => setChapter(g, v)"
            />
            <span class="chapter-label ellipsis">{{ g.chapter.num }}: {{ g.chapter.name }}</span>
          </div>
          <template v-if="boq.expandedChapterIds.includes(g.chapter.id)">
            <div
              v-for="sc in g.subChapters"
              :key="sc.id"
              class="sub-row"
              :class="{ checked: subChecked(sc) }"
            >
              <BaseCheckbox
                size="small"
                :model-value="subChecked(sc)"
                @update:model-value="(v) => setSub(g, sc, v)"
              />
              <span class="sub-label ellipsis">{{ sc.num }}-{{ sc.name }}</span>
            </div>
          </template>
        </div>
        <div v-if="!usedTree.length" class="chapters-empty">אין עדיין פרקים עם סעיפים</div>
      </div>
    </template>

    <ContextMenu
      v-if="menu"
      :items="kebabItems"
      :x="menu.x"
      :y="menu.y"
      @select="onKebabSelect"
      @close="menu = null"
    />
    <ContextMenu
      v-if="addMenu"
      :items="[
        { key: 'brother', label: 'הוספת אח', icon: 'plus-circle' },
        { key: 'son', label: 'הוספת בן', icon: 'plus-circle' },
      ]"
      :x="addMenu.x"
      :y="addMenu.y"
      @select="onAddSelect"
      @close="addMenu = null"
    />
    <StructureElementModal
      v-if="elementModal"
      :mode="elementModal.mode"
      :ref-element-name="elementModal.refElement?.name || ''"
      :initial="elementModal.mode === 'edit' ? elementModal.refElement : null"
      @close="elementModal = null"
      @save="saveElement"
    />
    <DeleteConfirmModal
      v-if="deleteTarget"
      title="מחיקת מבנה"
      :message="`האם אתה בטוח שברצונך למחוק את &quot;${deleteTarget.name}&quot;?`"
      :detail="`פעולה זו תסיר גם ${boq.itemCountUnder(deleteTarget.id)} סעיפים המשויכים למבנה`"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </aside>
</template>

<style scoped>
.boq-sidebar {
  width: 291px;
  flex-shrink: 0;
  background: var(--surface);
  border-left: 2px solid var(--divider);
  padding: 12px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow: hidden;
}
/* segmented control */
.side-tabs {
  display: flex;
  flex-direction: row-reverse;
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  background: var(--surface);
  height: 34px;
  align-items: flex-end;
  flex-shrink: 0;
}
.side-tab {
  flex: 1;
  background: var(--surface);
  border: none;
  padding: 5px 6px;
  border-radius: 6px;
}
.side-tab-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  width: 100%;
}
.side-tab-inner.active {
  background: var(--page-bg);
  color: #315583;
}
/* add row */
.add-row {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: flex-end; /* left edge in RTL, per the Figma frames */
  flex-shrink: 0;
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
}
/* trees */
.tree,
.chapters-tree {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.tree-root-row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: var(--row-h-tree);
  border-radius: 8px;
  padding: 0 4px;
  cursor: pointer;
}
.tree-root-row:hover {
  background: var(--surface-subtle);
}
.tree-root-row.selected {
  background: var(--brand-primary-soft);
}
.root-label {
  font-size: 14px;
}
.spacer {
  flex: 1;
}
.chevron {
  display: inline-flex;
  color: var(--text-primary);
}
.eye {
  display: inline-flex;
  color: var(--brand-primary);
  padding: 3px;
}
/* פרקים */
.select-all-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 4px;
}
.select-all-label {
  font-size: 14px;
  font-weight: 700;
}
.chapters-divider {
  height: 1px;
  background: var(--divider);
  margin: 2px 0 6px;
}
.chapter-row,
.sub-row {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  border-radius: 8px;
  padding: 0 4px;
  cursor: default;
}
.chapter-row:hover,
.sub-row:hover {
  background: var(--surface-subtle);
}
.chapter-row.checked,
.sub-row.checked {
  background: var(--brand-primary-soft);
}
.chapter-label {
  font-size: 14px;
  max-width: 190px;
}
.sub-row {
  padding-right: 28px;
}
.sub-label {
  font-size: 13px;
  color: var(--text-primary);
  max-width: 180px;
}
.chapters-empty {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 24px 0;
}
</style>
