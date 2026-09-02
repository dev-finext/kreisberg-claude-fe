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
const inputEl = ref(null);

const selectedLabel = computed(() => props.options.find((o) => o.value === props.modelValue)?.label || "");
const filtered = computed(() => {
  const q = query.value.trim();
  if (q.length < 2) return props.options;
  return props.options.filter((o) => o.label.includes(q));
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
function onEnter() {
  if (filtered.value.length === 1) choose(filtered.value[0]);
}
</script>

<template>
  <div class="combo" :class="{ disabled }">
    <div class="combo-field" @click="!disabled && (open = !open)">
      <button v-if="modelValue !== null" class="combo-clear" @click.stop="clear">
        <AppIcon name="cancel" :size="14" />
      </button>
      <span class="combo-chevron"><AppIcon name="chevron-down" :size="16" /></span>
      <input
        ref="inputEl"
        class="combo-input"
        :value="open ? query : selectedLabel"
        :placeholder="selectedLabel || placeholder"
        :disabled="disabled"
        @input="
          query = $event.target.value;
          open = true;
        "
        @keyup.enter="onEnter"
        @focus="open = true"
      />
    </div>
    <div v-if="open && !disabled" class="combo-menu scroll-slim" @mouseleave="open = false">
      <button
        v-for="o in filtered"
        :key="o.value"
        class="combo-opt ellipsis"
        :class="{ active: o.value === modelValue }"
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
}
.combo-field {
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  gap: 6px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  height: 40px;
  padding: 0 8px;
  background: var(--surface);
  cursor: pointer;
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
.combo-opt:hover {
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
