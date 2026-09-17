<script setup>
import { computed } from "vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";

/**
 * Catalog sections as one plain list — name, code and unit on a line. The
 * code already says which פרק / תת פרק a section belongs to, so neither
 * סעיפים קשורים nor סעיפים חלופיים draws those as heading lines.
 * Alternatives are pickable, so those rows carry a checkbox.
 */
const props = defineProps({
  /** catalog item objects to lay out */
  items: { type: Array, default: () => [] },
  /** show a checkbox on every row */
  selectable: { type: Boolean, default: false },
  /** ids ticked, when selectable */
  modelValue: { type: Array, default: () => [] },
  empty: { type: String, default: "אין סעיפים להצגה" },
});
const emit = defineEmits(["update:modelValue", "pick"]);

const rows = computed(() => props.items.filter(Boolean));

function checked(id) {
  return props.modelValue.includes(id);
}
function setChecked(id, v) {
  emit(
    "update:modelValue",
    v ? [...new Set([...props.modelValue, id])] : props.modelValue.filter((x) => x !== id)
  );
}
</script>

<template>
  <div class="cit">
    <div v-for="it in rows" :key="it.id" class="cit-row" @click="emit('pick', it)">
      <BaseCheckbox
        v-if="selectable"
        size="small"
        :model-value="checked(it.id)"
        @update:model-value="(v) => setChecked(it.id, v)"
      />
      <span v-full-title class="cit-label ellipsis">{{ it.name }}</span>
      <span class="cit-code num">{{ it.code }}</span>
      <span class="cit-unit">({{ it.unit }})</span>
    </div>
    <p v-if="!rows.length" class="cit-empty">{{ empty }}</p>
  </div>
</template>

<style scoped>
.cit {
  display: flex;
  flex-direction: column;
}
.cit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  font-size: 14px;
  line-height: 18px;
  color: var(--text-primary);
}
.cit-label {
  min-width: 0;
}
.cit-code {
  color: var(--text-secondary);
}
.cit-unit {
  color: var(--text-secondary);
}
.cit-empty {
  font-size: 14px;
  color: var(--text-muted);
  padding: 4px 0;
}
</style>
