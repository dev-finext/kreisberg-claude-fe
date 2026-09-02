<script setup>
import { reactive, computed } from "vue";
import { useDbStore } from "@/stores/db";
import { useBoqStore } from "@/stores/boq";
import { useUiStore } from "@/stores/ui";
import BaseModal from "@/components/shared/BaseModal.vue";

const props = defineProps({
  projectId: { type: Number, required: true },
  editHeader: { type: Object, default: null },
});
const emit = defineEmits(["close", "saved"]);

const db = useDbStore();
const boqStore = useBoqStore();
const ui = useUiStore();

const form = reactive({
  name: props.editHeader?.name || "",
  catalogId: props.editHeader?.catalogId || null,
  resourceTypeId: props.editHeader?.resourceTypeId || null,
  resourceId: props.editHeader?.resourceId || null,
});

const catalogs = [db.catalog];
const resources = computed(() =>
  form.resourceTypeId ? db.constructors.filter((c) => c.typeId === form.resourceTypeId) : []
);
const valid = computed(() => !!form.name.trim() && !!form.catalogId);

function save() {
  if (!valid.value) return;
  if (props.editHeader) {
    boqStore.updateBoqHeader(props.editHeader.id, {
      name: form.name.trim(),
      resourceTypeId: form.resourceTypeId,
      resourceId: form.resourceId,
    });
    ui.toast("כתב הכמויות עודכן בהצלחה");
    emit("close");
  } else {
    const h = boqStore.createBoqHeader({
      projectId: props.projectId,
      name: form.name.trim(),
      catalogId: form.catalogId,
      resourceTypeId: form.resourceTypeId,
      resourceId: form.resourceId,
    });
    ui.toast("כתב כמויות נוצר בהצלחה");
    emit("saved", h);
  }
}
</script>

<template>
  <BaseModal
    :title="editHeader ? 'עריכת כתב כמויות' : 'יצירת כתב כמויות - הגדרות ראשיות'"
    width="560px"
    :confirm-disabled="!valid"
    @close="emit('close')"
    @confirm="save"
  >
    <div class="fields">
      <div class="field">
        <label class="field-label">שם</label>
        <input v-model="form.name" class="input" placeholder="שם המסמך/ תצורה" />
      </div>
      <div class="field">
        <label class="field-label">קטלוג</label>
        <select v-model="form.catalogId" class="select" :disabled="!!editHeader">
          <option :value="null" disabled>בחר קטלוג</option>
          <option v-for="c in catalogs" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div class="grid-2">
        <div class="field">
          <label class="field-label">סטטוס</label>
          <input class="input" value="טיוטה" disabled />
        </div>
        <div class="field">
          <label class="field-label">סיווג</label>
          <input class="input" value="מפרט" disabled />
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label class="field-label">סוג משאב</label>
          <select v-model="form.resourceTypeId" class="select">
            <option :value="null">בחר סוג משאב</option>
            <option v-for="rt in db.resourceTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">זיהוי משאב</label>
          <select v-model="form.resourceId" class="select" :disabled="!form.resourceTypeId">
            <option :value="null">בחר זיהוי משאב</option>
            <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.fields {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
  text-align: right;
}
</style>
