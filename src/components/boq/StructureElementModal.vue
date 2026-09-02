<script setup>
import { ref, computed } from "vue";
import BaseModal from "@/components/shared/BaseModal.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";

const props = defineProps({
  /** 'brother' | 'son' | 'edit' */
  mode: { type: String, required: true },
  refElementName: { type: String, default: "" },
  initial: { type: Object, default: null },
});
const emit = defineEmits(["close", "save"]);

const name = ref(props.initial?.name || "");
const description = ref(props.initial?.description || "");
const inBudget = ref(props.initial ? !!props.initial.inBudget : true);

const title = computed(() => {
  if (props.mode === "edit") return `עריכת מבנה: ${props.refElementName}`;
  if (props.mode === "son") return `הוספת בן ל"${props.refElementName}"`;
  return props.refElementName ? `הוספת אח ל"${props.refElementName}"` : "הוספת מבנה";
});

const commonNames = [
  "בניין",
  "קומה",
  "דירה",
  "חדר",
  "חדרים רטובים",
  "מבואות",
  "מרפסת",
  "חניה",
  "מחסן",
  "גג",
  "פיתוח שטח",
];

function save() {
  if (!name.value.trim()) return;
  emit("save", { name: name.value.trim(), description: description.value.trim(), inBudget: inBudget.value });
}
</script>

<template>
  <BaseModal
    :title="title"
    width="477px"
    :confirm-disabled="!name.trim()"
    @close="emit('close')"
    @confirm="save"
  >
    <div class="fields">
      <div class="field">
        <label class="field-label">שם מבנה</label>
        <input
          v-model="name"
          class="input"
          list="structure-name-options"
          placeholder="בחר שם מבנה"
          @keyup.enter="save"
        />
        <datalist id="structure-name-options">
          <option v-for="n in commonNames" :key="n" :value="n" />
        </datalist>
      </div>
      <div class="field">
        <label class="field-label">תיאור</label>
        <input v-model="description" class="input" placeholder="פרט תיאור מבנה" />
      </div>
      <div class="field field-toggle">
        <label class="field-label">כלול בכתב הכמויות</label>
        <BaseToggle v-model="inBudget" />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.fields {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 413px;
  max-width: 100%;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
  padding: 0 8px;
  text-align: right;
}
.field-toggle {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.field-toggle .field-label {
  padding: 0;
}
</style>
