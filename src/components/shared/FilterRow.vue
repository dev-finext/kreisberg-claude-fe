<script setup>
import { ref } from "vue";
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
        <button class="filter-btn" @click.stop="openKey = openKey === def.key ? null : def.key">
          <span class="f-label">{{ def.label }}</span>
          <span class="f-value">{{ valueLabel(def) }}</span>
          <AppIcon name="chevron-down" :size="14" />
        </button>
        <div v-if="openKey === def.key" class="filter-menu scroll-slim" @mouseleave="openKey = null">
          <label class="f-opt">
            <BaseCheckbox
              size="small"
              :model-value="!selectionOf(def.key).length"
              @update:model-value="(v) => setAll(def, v)"
            />
            <span>הכל</span>
          </label>
          <div class="f-divider" />
          <label v-for="opt in def.options" :key="opt.value" class="f-opt">
            <BaseCheckbox
              size="small"
              :model-value="selectionOf(def.key).includes(opt.value)"
              @update:model-value="(v) => toggleOption(def, opt, v)"
            />
            <span class="ellipsis">{{ opt.label }}</span>
          </label>
          <p v-if="!def.options.length" class="f-empty">אין ערכים לסינון</p>
        </div>
      </div>
    </div>
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
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 30;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-menu);
  padding: 6px;
  width: 210px;
  max-height: 260px;
  overflow-y: auto;
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
