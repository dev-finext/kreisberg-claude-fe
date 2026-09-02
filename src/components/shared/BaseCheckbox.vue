<script setup>
import AppIcon from "@/components/shared/AppIcon.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** 'small' = the 10px tree checkbox, 'regular' = 16px table checkbox */
  size: { type: String, default: "regular" },
});
const emit = defineEmits(["update:modelValue"]);
function toggle() {
  if (!props.disabled) emit("update:modelValue", !props.modelValue);
}
</script>

<template>
  <button
    type="button"
    class="cb"
    :class="[size, { checked: modelValue, disabled }]"
    role="checkbox"
    :aria-checked="modelValue"
    @click.stop="toggle"
  >
    <span class="box">
      <AppIcon v-if="modelValue" name="check" :size="size === 'small' ? 8 : 12" />
    </span>
  </button>
</template>

<style scoped>
.cb {
  background: none;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
.box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--text-secondary);
  border-radius: 2px;
  background: var(--surface);
  color: #fff;
  transition: background 0.1s ease;
}
.cb.small .box {
  width: 10px;
  height: 10px;
}
.cb.regular .box {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}
.cb.checked .box {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
}
.cb.small.checked .box {
  background: var(--checkbox-checked);
  border-color: var(--checkbox-checked);
}
.cb.disabled {
  cursor: not-allowed;
}
.cb.disabled .box {
  border-color: var(--text-disabled);
  background: var(--surface-muted);
  color: var(--text-disabled);
}
.cb.disabled.checked .box {
  background: var(--text-disabled);
  border-color: var(--text-disabled);
  color: #fff;
}
</style>
