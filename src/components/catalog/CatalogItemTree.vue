<script setup>
import { computed } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";

/**
 * Catalog sections as one plain list — name, code and unit on a line. The
 * code already says which פרק / תת פרק a section belongs to, so neither
 * סעיפים קשורים nor סעיפים חלופיים draws those as heading lines.
 */
const props = defineProps({
  /** catalog item objects to lay out */
  items: { type: Array, default: () => [] },
  /** show a trash on every row, for lists the section owns */
  removable: { type: Boolean, default: false },
  empty: { type: String, default: "אין סעיפים להצגה" },
});
const emit = defineEmits(["pick", "remove"]);

const rows = computed(() => props.items.filter(Boolean));
</script>

<template>
  <div class="cit">
    <div v-for="it in rows" :key="it.id" class="cit-row" @click="emit('pick', it)">
      <span v-full-title class="cit-label ellipsis">{{ it.name }}</span>
      <span class="cit-code num">{{ it.code }}</span>
      <span class="cit-unit">({{ it.unit }})</span>
      <button v-if="removable" class="cit-remove" title="הסרה" @click.stop="emit('remove', it)">
        <AppIcon name="trash" :size="18" />
      </button>
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
/* the trash sits on the row's far edge, always visible — the same affordance
   the תתי סעיפים table in this popup gives each of its rows */
.cit-remove {
  margin-right: auto;
  display: inline-flex;
  background: none;
  border: none;
  padding: 0;
  color: var(--danger);
  opacity: 0.75;
}
.cit-row:hover .cit-remove,
.cit-remove:focus-visible {
  opacity: 1;
}
.cit-empty {
  font-size: 14px;
  color: var(--text-muted);
  padding: 4px 0;
}
</style>
