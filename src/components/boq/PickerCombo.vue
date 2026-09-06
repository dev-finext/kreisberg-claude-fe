<script setup>
import { ref, computed, watch } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, required: true }, // [{value, label}]
  placeholder: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const query = ref("");
const activeIdx = ref(0); // the highlighted ("closest") option — Enter picks it
const inputEl = ref(null);
const menuEl = ref(null);

const selectedLabel = computed(() => props.options.find((o) => o.value === props.modelValue)?.label || "");

/**
 * Typing narrows the list live; the closest match is ranked first and highlighted.
 * Leading zeros in numeric runs are ignored so "7" finds "07- …" (and "07" still does).
 */
const stripZeros = (s) => s.toLowerCase().replace(/(^|\D)0+(\d)/g, "$1$2");
function rank(label, q) {
  const l = label.toLowerCase();
  const ls = stripZeros(label);
  const qs = stripZeros(q);
  if (l.startsWith(q) || ls.startsWith(qs)) return 0; // starts with what was typed = closest
  if (l.includes(q) || ls.includes(qs)) return 1;
  return -1;
}
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.options;
  return props.options
    .map((o) => ({ o, r: rank(o.label, q) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .map((x) => x.o);
});

watch(filtered, () => {
  activeIdx.value = 0;
});
watch(activeIdx, () => {
  menuEl.value?.children[activeIdx.value]?.scrollIntoView?.({ block: "nearest" });
});
watch(
  () => props.modelValue,
  () => {
    query.value = "";
  }
);

function choose(opt) {
  emit("update:modelValue", opt.value);
  open.value = false;
  query.value = "";
}
function clear() {
  emit("update:modelValue", null);
  query.value = "";
  inputEl.value?.focus();
}
function focus() {
  inputEl.value?.focus();
}
defineExpose({ focus });

/* keyboard: arrows move the highlight, Enter selects it, Tab moves on WITHOUT selecting */
function onKeydown(e) {
  const n = filtered.value.length;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    open.value = true;
    if (n) activeIdx.value = (activeIdx.value + 1) % n;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    open.value = true;
    if (n) activeIdx.value = (activeIdx.value - 1 + n) % n;
  } else if (e.key === "Enter") {
    e.preventDefault();
    const opt = filtered.value[activeIdx.value];
    if (open.value && opt) choose(opt);
  } else if (e.key === "Tab") {
    open.value = false;
  } else if (e.key === "Escape" && open.value) {
    e.stopPropagation(); // close only the list, not the whole picker
    open.value = false;
  }
}
function onFieldMousedown(e) {
  if (props.disabled) return;
  e.preventDefault(); // keep the caret in the input
  inputEl.value?.focus();
  open.value = !open.value;
}
</script>

<template>
  <div class="combo" :class="{ disabled, open }">
    <div class="combo-field" @mousedown="onFieldMousedown">
      <button
        v-if="modelValue !== null"
        class="combo-clear"
        tabindex="-1"
        title="ניקוי"
        @mousedown.stop.prevent
        @click="clear"
      >
        <AppIcon name="cancel" :size="14" />
      </button>
      <span class="combo-chevron"><AppIcon name="chevron-down" :size="16" /></span>
      <input
        ref="inputEl"
        class="combo-input"
        :value="open ? query : selectedLabel"
        :placeholder="selectedLabel || placeholder"
        :disabled="disabled"
        autocomplete="off"
        @mousedown.stop
        @input="
          query = $event.target.value;
          open = true;
        "
        @keydown="onKeydown"
        @focus="open = true"
        @blur="open = false"
      />
    </div>
    <div v-if="open && !disabled" ref="menuEl" class="combo-menu scroll-slim" @mousedown.prevent>
      <button
        v-for="(o, i) in filtered"
        :key="o.value"
        class="combo-opt ellipsis"
        :class="{ active: o.value === modelValue, hl: i === activeIdx }"
        tabindex="-1"
        @mouseenter="activeIdx = i"
        @click="choose(o)"
      >
        {{ o.label }}
      </button>
      <div v-if="!filtered.length" class="combo-none">לא נמצאו תוצאות</div>
    </div>
  </div>
</template>

<style scoped>
.combo {
  position: relative;
  flex: 1;
  min-width: 0;
}
.combo-field {
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  gap: 8px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  height: 40px;
  padding: 0 8px;
  background: var(--surface);
  cursor: pointer;
}
.combo.open .combo-field {
  border-color: var(--brand-primary);
}
.combo.disabled .combo-field {
  background: var(--surface-muted);
  cursor: not-allowed;
}
.combo-input {
  border: none;
  background: none;
  outline: none;
  flex: 1;
  text-align: right;
  font-size: 14px;
  font-family: inherit;
  color: var(--text-primary);
  min-width: 0;
}
.combo-input::placeholder {
  color: var(--text-muted);
}
.combo-input:disabled {
  cursor: not-allowed;
}
.combo-chevron {
  color: var(--text-secondary);
  display: inline-flex;
  order: -1;
}
.combo-clear {
  background: none;
  border: none;
  color: var(--text-muted);
  display: inline-flex;
  padding: 2px;
  order: -2;
}
.combo-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 40;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-menu);
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}
.combo-opt {
  display: block;
  width: 100%;
  background: none;
  border: none;
  text-align: right;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--text-primary);
}
.combo-opt.hl {
  background: var(--surface-subtle);
}
.combo-opt.active {
  color: var(--brand-primary);
  font-weight: 600;
}
.combo-none {
  font-size: 13px;
  color: var(--text-muted);
  padding: 10px;
  text-align: center;
}
</style>
