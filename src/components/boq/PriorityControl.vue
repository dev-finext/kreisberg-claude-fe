<script setup>
import { ref, computed } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import { PRIORITY_LABELS, PRIORITY_LEVELS } from "@/constants";

const props = defineProps({
  modelValue: { type: String, default: "recommended" }, // mandatory | recommended | optional
  /** 'dropdown' (main table) | 'squares' (nested tables) */
  variant: { type: String, default: "dropdown" },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const label = computed(() => PRIORITY_LABELS[props.modelValue] || "מומלץ");
const level = computed(() => PRIORITY_LEVELS[props.modelValue] || 2);

function choose(v) {
  open.value = false;
  if (v !== props.modelValue) emit("update:modelValue", v);
}
</script>

<template>
  <div v-if="variant === 'squares'" class="prio-squares" :title="label">
    <span v-for="i in 3" :key="i" class="sq" :class="{ on: i <= level }" />
  </div>
  <div v-else class="prio-dd" :class="{ disabled }">
    <button class="prio-btn" :disabled="disabled" @click.stop="open = !open">
      <span class="prio-label">{{ label }}</span>
      <AppIcon name="chevron-down" :size="14" />
    </button>
    <div v-if="open" class="prio-menu" @mouseleave="open = false">
      <button
        v-for="(l, v) in PRIORITY_LABELS"
        :key="v"
        class="prio-opt"
        :class="{ active: v === modelValue }"
        @click.stop="choose(v)"
      >
        {{ l }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.prio-dd {
  position: relative;
  display: inline-block;
}
.prio-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-direction: row-reverse;
  background: none;
  border: none;
  font-size: 13px;
  color: var(--text-primary);
  padding: 2px 4px;
}
.prio-btn:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}
.prio-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 30;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-menu);
  padding: 4px;
  min-width: 110px;
  display: flex;
  flex-direction: column;
}
.prio-opt {
  background: none;
  border: none;
  text-align: right;
  font-size: 13px;
  padding: 7px 10px;
  border-radius: 6px;
  color: var(--text-primary);
}
.prio-opt:hover {
  background: var(--surface-subtle);
}
.prio-opt.active {
  color: var(--brand-primary);
  font-weight: 600;
}
.prio-squares {
  display: inline-flex;
  gap: 2px;
  direction: ltr;
}
.sq {
  width: 6px;
  height: 6px;
  border-radius: 1px;
  background: var(--border-strong);
}
.sq.on {
  background: var(--text-primary);
}
</style>
