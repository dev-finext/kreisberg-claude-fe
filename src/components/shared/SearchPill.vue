<script setup>
import AppIcon from "@/components/shared/AppIcon.vue";

defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "חיפוש" },
  width: { type: String, default: "226px" },
});
defineEmits(["update:modelValue", "submit"]);
</script>

<template>
  <div class="search-pill" :style="{ width }">
    <input
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup.enter="$emit('submit')"
    />
    <AppIcon name="search" :size="20" />
  </div>
</template>

<style scoped>
.search-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row-reverse;
  background: var(--surface-muted);
  border-radius: var(--radius-pill);
  height: 40px;
  padding: 0 16px;
  color: var(--text-disabled);
  flex-shrink: 0;
}
.search-pill input {
  border: none;
  background: none;
  outline: none;
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: inherit;
}
.search-pill input::placeholder {
  color: var(--text-disabled);
}
</style>
