<script setup>
import { ref, computed } from "vue";
import { useFloating } from "@/composables/useFloating";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";

/**
 * The filter strip used across the lists: one multi-select per column,
 * "הכל" when nothing is ticked, and a ניקוי that empties the lot.
 * The selection is a plain { key: [value, …] } map the host owns.
 */
const props = defineProps({
  /** [{ key, label, options: [{ value, label }] }] */
  defs: { type: Array, required: true },
  modelValue: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["update:modelValue", "clear"]);

const openKey = ref(null);
/* one list at a time, floating above the page against the filter that opened it */
const anchor = ref(null);
const menu = ref(null);
const openDef = computed(() => props.defs.find((d) => d.key === openKey.value) || null);
const { style: menuStyle } = useFloating(openKey, {
  trigger: anchor,
  panel: menu,
  close: () => (openKey.value = null),
  maxHeight: 260,
});
function toggleMenu(def, e) {
  if (openKey.value === def.key) {
    openKey.value = null;
    return;
  }
  anchor.value = e.currentTarget;
  openKey.value = def.key;
}

function selectionOf(key) {
  return props.modelValue[key] || [];
}
function valueLabel(def) {
  const sel = selectionOf(def.key);
  if (!sel.length) return "הכל";
  if (sel.length === 1) return def.options.find((o) => o.value === sel[0])?.label || "הכל";
  return `${sel.length} נבחרו`;
}
function toggleOption(def, opt, v) {
  const sel = [...selectionOf(def.key)];
  const i = sel.indexOf(opt.value);
  if (v && i < 0) sel.push(opt.value);
  if (!v && i >= 0) sel.splice(i, 1);
  emit("update:modelValue", { ...props.modelValue, [def.key]: sel });
}
function setAll(def, v) {
  emit("update:modelValue", { ...props.modelValue, [def.key]: [] });
  if (!v) openKey.value = null;
}
function clearAll() {
  emit("update:modelValue", {});
  emit("clear");
}
</script>

<template>
  <div class="filter-row">
    <div class="filters">
      <div v-for="def in defs" :key="def.key" class="filter">
        <button
          class="filter-btn"
          :class="{ open: openKey === def.key }"
          @click.stop="toggleMenu(def, $event)"
        >
          <span class="f-label">{{ def.label }}</span>
          <span class="f-value">{{ valueLabel(def) }}</span>
          <AppIcon name="chevron-down" :size="14" />
        </button>
      </div>
    </div>
    <Teleport to="body">
      <div v-if="openDef" ref="menu" class="filter-menu scroll-slim" :style="menuStyle">
        <label class="f-opt">
          <BaseCheckbox
            size="small"
            :model-value="!selectionOf(openDef.key).length"
            @update:model-value="(v) => setAll(openDef, v)"
          />
          <span>הכל</span>
        </label>
        <div class="f-divider" />
        <label v-for="opt in openDef.options" :key="opt.value" class="f-opt">
          <BaseCheckbox
            size="small"
            :model-value="selectionOf(openDef.key).includes(opt.value)"
            @update:model-value="(v) => toggleOption(openDef, opt, v)"
          />
          <span v-full-title class="ellipsis">{{ opt.label }}</span>
        </label>
        <p v-if="!openDef.options.length" class="f-empty">אין ערכים לסינון</p>
      </div>
    </Teleport>
    <div class="filter-actions">
      <slot name="actions" />
      <button class="btn-text" @click="clearAll">ניקוי</button>
    </div>
  </div>
</template>

<style scoped>
.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  min-height: 48px;
  margin-bottom: 10px;
}
.filters {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.filter {
  position: relative;
}
.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-size: 13px;
  color: var(--text-secondary);
}
.f-label {
  color: var(--text-secondary);
}
.f-value {
  color: var(--text-primary);
  font-weight: 600;
}
.filter-menu {
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-menu);
  padding: 6px;
  width: 240px;
  display: flex;
  flex-direction: column;
}
.f-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  font-size: 13px;
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
}
.f-opt:hover {
  background: var(--surface-subtle);
}
.f-divider {
  height: 1px;
  background: var(--divider);
  margin: 3px 0;
}
.f-empty {
  padding: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row-reverse;
}
</style>
