<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);
function toggle() {
  if (!props.disabled) emit("update:modelValue", !props.modelValue);
}
</script>

<template>
  <button
    type="button"
    class="toggle"
    :class="{ on: modelValue, disabled }"
    role="switch"
    :aria-checked="modelValue"
    @click="toggle"
  >
    <span class="knob" />
  </button>
</template>

<style scoped>
.toggle {
  width: 35px;
  height: 20px;
  border-radius: 999px;
  border: none;
  background: var(--border-strong);
  position: relative;
  transition: background 0.15s ease;
  padding: 0;
  flex-shrink: 0;
}
.toggle.on {
  background: var(--brand-primary);
}
.toggle.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.knob {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease;
}
.toggle.on .knob {
  transform: translateX(-15px);
}
</style>
