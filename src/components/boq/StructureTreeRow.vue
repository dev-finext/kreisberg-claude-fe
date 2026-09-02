<script setup>
import { ref, computed, nextTick } from "vue";
import { useBoqStore } from "@/stores/boq";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  renamingId: { type: Number, default: null },
});
const emit = defineEmits(["kebab", "rename-done", "request-rename"]);

const boq = useBoqStore();
const renameInput = ref(null);
const renameValue = ref("");
const dropPos = ref(null); // 'inside' | 'before' | null

const hasChildren = computed(() => props.node.children.length > 0);
const isLeaf = computed(() => !hasChildren.value);
const expanded = computed(() => boq.expandedElementIds.includes(props.node.id));
const selected = computed(() => boq.selectedElementId === props.node.id);
const checked = computed(() => boq.checkedLeafElementIds.includes(props.node.id));
const isRenaming = computed(() => props.renamingId === props.node.id);
const pathTitle = computed(() => boq.elementPath(props.node.id).join(" › "));

function toggleExpand() {
  const i = boq.expandedElementIds.indexOf(props.node.id);
  if (i >= 0) boq.expandedElementIds.splice(i, 1);
  else boq.expandedElementIds.push(props.node.id);
}
function toggleChecked(v) {
  const list = boq.checkedLeafElementIds;
  const i = list.indexOf(props.node.id);
  if (v && i < 0) list.push(props.node.id);
  if (!v && i >= 0) list.splice(i, 1);
}
async function startRename() {
  renameValue.value = props.node.name;
  await nextTick();
  renameInput.value?.focus();
  renameInput.value?.select();
}
defineExpose({ startRename });

function commitRename() {
  if (renameValue.value.trim() && renameValue.value.trim() !== props.node.name) {
    boq.updateElement(props.node.id, { name: renameValue.value.trim() });
  }
  emit("rename-done");
}
function cancelRename() {
  emit("rename-done");
}
function beginRenaming() {
  renameValue.value = props.node.name;
  emit("request-rename", props.node.id);
  nextTick(() => {
    renameInput.value?.focus();
    renameInput.value?.select();
  });
}

/* drag & drop re-parenting */
function onDragStart(e) {
  e.dataTransfer.setData("text/element-id", String(props.node.id));
  e.dataTransfer.effectAllowed = "move";
}
function onDragOver(e) {
  if (!e.dataTransfer.types.includes("text/element-id")) return;
  e.preventDefault();
  const rect = e.currentTarget.getBoundingClientRect();
  dropPos.value = e.clientY - rect.top < rect.height / 3 ? "before" : "inside";
}
function onDragLeave() {
  dropPos.value = null;
}
function onDrop(e) {
  const id = Number(e.dataTransfer.getData("text/element-id"));
  const pos = dropPos.value;
  dropPos.value = null;
  if (!id || id === props.node.id) return;
  if (pos === "inside") {
    boq.moveElement(id, props.node.id);
  } else {
    boq.moveElement(id, props.node.parentId || null);
  }
}
</script>

<template>
  <div
    class="tree-row"
    :class="{ selected, 'drop-inside': dropPos === 'inside', 'drop-before': dropPos === 'before', 'hidden-el': !node.visible }"
    :style="{ paddingRight: 4 + depth * 16 + 'px' }"
    :title="pathTitle"
    draggable="true"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="boq.selectElement(node.id)"
    @dblclick.stop="beginRenaming"
  >
    <span class="drag-handle" @click.stop>
      <AppIcon name="drag" :size="16" />
    </span>
    <span v-if="hasChildren" class="chevron" @click.stop="toggleExpand">
      <AppIcon :name="expanded ? 'chevron-down' : 'chevron-left'" :size="16" />
    </span>
    <template v-if="isRenaming">
      <input
        ref="renameInput"
        v-model="renameValue"
        class="rename-input"
        @keyup.enter="commitRename"
        @keyup.esc="cancelRename"
        @blur="commitRename"
        @click.stop
      />
    </template>
    <template v-else>
      <span class="label ellipsis">{{ node.name }}</span>
    </template>
    <BaseCheckbox v-if="isLeaf && !isRenaming" size="small" :model-value="checked" @update:model-value="toggleChecked" />
    <span class="spacer" />
    <span class="eye" :class="{ off: !node.visible }" @click.stop="boq.toggleElementVisibility(node.id)">
      <AppIcon :name="node.visible ? 'eye' : 'eye-closed'" :size="18" />
    </span>
    <span class="kebab" @click.stop="emit('kebab', { node, event: $event })">
      <AppIcon name="kebab" :size="16" />
    </span>
  </div>
  <template v-if="expanded">
    <StructureTreeRow
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :depth="depth + 1"
      :renaming-id="renamingId"
      @kebab="emit('kebab', $event)"
      @rename-done="emit('rename-done')"
      @request-rename="emit('request-rename', $event)"
    />
  </template>
</template>

<style scoped>
.tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: var(--row-h-tree);
  border-radius: 8px;
  padding-left: 4px;
  cursor: pointer;
  position: relative;
  color: var(--text-primary);
}
.tree-row:hover {
  background: var(--surface-subtle);
}
.tree-row.selected {
  background: var(--brand-primary-soft);
}
.tree-row.drop-inside {
  background: var(--page-bg);
  outline: 1.5px dashed var(--brand-primary);
  outline-offset: -1.5px;
}
.tree-row.drop-before::before {
  content: "";
  position: absolute;
  top: -1px;
  right: 8px;
  left: 8px;
  height: 2px;
  background: var(--brand-primary);
  border-radius: 1px;
}
.drag-handle {
  width: 16px;
  display: inline-flex;
  justify-content: center;
  color: var(--text-muted);
  opacity: 0;
  cursor: grab;
  flex-shrink: 0;
}
.tree-row:hover .drag-handle,
.tree-row.selected .drag-handle {
  opacity: 1;
}
.chevron {
  display: inline-flex;
  color: var(--text-primary);
  flex-shrink: 0;
}
.label {
  font-size: 14px;
  line-height: 18px;
  text-align: right;
  max-width: 150px;
}
.rename-input {
  border: 1px solid #6952ef;
  border-radius: 6px;
  padding: 3px 6px;
  font-size: 14px;
  font-family: inherit;
  color: var(--text-primary);
  width: 149px;
  outline: none;
}
.spacer {
  flex: 1;
}
.eye {
  display: inline-flex;
  color: var(--brand-primary);
  flex-shrink: 0;
  padding: 3px;
}
.eye.off {
  color: var(--brand-primary);
}
.hidden-el > .label {
  color: var(--text-primary);
}
.kebab {
  display: inline-flex;
  color: var(--text-secondary);
  opacity: 0;
  flex-shrink: 0;
  padding: 2px;
}
.tree-row:hover .kebab,
.tree-row.selected .kebab {
  opacity: 1;
}
</style>
