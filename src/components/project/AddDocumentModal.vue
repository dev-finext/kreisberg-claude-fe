<script setup>
import { reactive, computed } from "vue";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import BaseModal from "@/components/shared/BaseModal.vue";

const props = defineProps({
  projectId: { type: Number, required: true },
  folderId: { type: Number, default: null },
  /** File picked by the user (name/extension only are stored) */
  file: { type: Object, default: null },
  /** existing document when editing */
  document: { type: Object, default: null },
});
const emit = defineEmits(["close", "saved"]);

const db = useDbStore();
const ui = useUiStore();

const SUB_TYPES = ["תוכנית", "חוזה", "מפרט", "בקשה להצעת מחיר", "הדמיה", "כתב כמויות", "אחר"];

const form = reactive({
  name: props.document?.name || (props.file ? props.file.name.replace(/\.[^.]+$/, "") : ""),
  subType: props.document?.subType || "",
  resourceTypeId: props.document?.resourceTypeId || null,
  resourceId: props.document?.resourceId || null,
});

const fileName = computed(() => props.file?.name || props.document?.fileName || "");
const resources = computed(() =>
  form.resourceTypeId ? db.constructors.filter((c) => c.typeId === form.resourceTypeId) : db.constructors
);
const valid = computed(() => form.name.trim().length > 0);

function save() {
  if (!valid.value) return;
  const now = new Date().toISOString();
  if (props.document) {
    const d = db.db.documents.find((x) => x.id === props.document.id);
    Object.assign(d, {
      name: form.name.trim(),
      subType: form.subType,
      resourceTypeId: form.resourceTypeId,
      resourceId: form.resourceId,
      updatedAt: now,
    });
    db.persist();
    ui.toast("המסמך עודכן בהצלחה");
    emit("saved", d);
    return;
  }
  const ext = (fileName.value.split(".").pop() || "").toUpperCase();
  const doc = {
    id: db.nextId("documents"),
    projectId: props.projectId,
    folderId: props.folderId,
    name: form.name.trim(),
    fileName: fileName.value,
    fileType: ext || "PDF",
    subType: form.subType,
    resourceTypeId: form.resourceTypeId,
    resourceId: form.resourceId,
    createdAt: now.slice(0, 10),
    updatedAt: now,
  };
  db.db.documents.push(doc);
  db.persist();
  ui.toast("המסמך נוסף בהצלחה");
  emit("saved", doc);
}
</script>

<template>
  <BaseModal
    :title="document ? 'עריכת מסמך' : 'הוספת מסמך חדש'"
    width="560px"
    :confirm-disabled="!valid"
    @close="emit('close')"
    @confirm="save"
  >
    <p v-if="fileName" class="file-line">
      <span class="fl-label">שם הקובץ:</span>
      <span class="fl-name num">{{ fileName }}</span>
    </p>
    <div class="grid-2">
      <div class="field">
        <label class="field-label">שם המסמך</label>
        <input v-model="form.name" class="input" placeholder="בחר שם מסמך" @keyup.enter="save" />
      </div>
      <div class="field">
        <label class="field-label">תת-סוג מסמך</label>
        <select v-model="form.subType" class="select">
          <option value="">בחר תת-סוג מסמך</option>
          <option v-for="s in SUB_TYPES" :key="s">{{ s }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">משאב</label>
        <select v-model="form.resourceTypeId" class="select">
          <option :value="null">בחר משאב</option>
          <option v-for="rt in db.resourceTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">סוג משאב</label>
        <select v-model="form.resourceId" class="select">
          <option :value="null">בחר סוג משאב</option>
          <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.file-line {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 16px;
  text-align: right;
}
.fl-label {
  font-weight: 600;
}
.fl-name {
  color: var(--text-secondary);
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 20px;
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
