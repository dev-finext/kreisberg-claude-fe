<script setup>
import { ref, computed } from "vue";
import { useDbStore } from "@/stores/db";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import BaseModal from "@/components/shared/BaseModal.vue";

const props = defineProps({
  /** catalog item ids that receive the tag (from the checked BOQ rows) */
  itemIds: { type: Array, default: () => [] },
});
const emit = defineEmits(["close"]);

const db = useDbStore();
const cat = useCatalogStore();
const ui = useUiStore();

const name = ref("");
const valid = computed(() => name.value.trim().length > 0);

function save() {
  const n = name.value.trim();
  if (!n) return;
  let tag = db.tags.find((t) => t.name === n);
  const created = !tag;
  if (!tag) {
    tag = { id: db.nextId("tags"), name: n };
    db.db.tags.push(tag);
  }
  for (const id of props.itemIds) {
    const it = cat.item(id);
    if (it && !it.tags.includes(tag.id)) it.tags.push(tag.id);
  }
  db.persist();
  if (props.itemIds.length) ui.toast(`התגית "${n}" שויכה ל-${props.itemIds.length} סעיפים`);
  else ui.toast(created ? `התגית "${n}" נוצרה` : `התגית "${n}" כבר קיימת`);
  emit("close");
}
</script>

<template>
  <BaseModal
    title="יצירת תגית חדשה"
    width="477px"
    :confirm-disabled="!valid"
    @close="emit('close')"
    @confirm="save"
  >
    <p class="hint">
      {{
        itemIds.length
          ? `התגית תשויך ל-${itemIds.length} הסעיפים המסומנים בטבלה`
          : "לא סומנו סעיפים — התגית תיווצר במאגר התגיות בלבד"
      }}
    </p>
    <label class="field-label">שם התגית</label>
    <input
      v-model="name"
      list="add-tag-options"
      class="input"
      placeholder="בחר/הקלד ליצירת תגית חדשה"
      @keyup.enter="save"
    />
    <datalist id="add-tag-options">
      <option v-for="t in db.tags" :key="t.id" :value="t.name" />
    </datalist>
  </BaseModal>
</template>

<style scoped>
.hint {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
  margin-bottom: 14px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
  text-align: right;
}
</style>
