<script setup>
import { reactive, computed } from "vue";
import BaseModal from "@/components/shared/BaseModal.vue";

const props = defineProps({
  /** 'chapter' | 'subChapter' */
  kind: { type: String, required: true },
  parentChapter: { type: Object, default: null },
  initial: { type: Object, default: null },
});
const emit = defineEmits(["close", "save"]);

const form = reactive({
  code: props.initial?.code || "",
  name: props.initial?.name || "",
});

const title = computed(() => {
  const noun = props.kind === "chapter" ? "פרק" : "תת פרק";
  return props.initial ? `עריכת ${noun}: ${props.initial.name}` : `הוספת ${noun}`;
});
const valid = computed(() => form.code.trim() && form.name.trim());

function save() {
  if (!valid.value) return;
  emit("save", { code: form.code.trim(), name: form.name.trim() });
}
</script>

<template>
  <BaseModal :title="title" width="477px" :confirm-disabled="!valid" @close="emit('close')" @confirm="save">
    <p v-if="kind === 'subChapter' && parentChapter" class="parent-line">
      פרק: <span class="num">{{ parentChapter.num }}</span> - {{ parentChapter.name }}
    </p>
    <div class="fields">
      <div class="field">
        <label class="field-label">{{ kind === "chapter" ? "קוד פרק" : "קוד תת פרק" }}</label>
        <input
          v-model="form.code"
          class="input num"
          :placeholder="kind === 'chapter' ? '12.00.0000' : '12.010.0000'"
        />
      </div>
      <div class="field">
        <label class="field-label">{{ kind === "chapter" ? "שם פרק" : "שם תת פרק" }}</label>
        <input v-model="form.name" class="input" placeholder="הקלד שם" @keyup.enter="save" />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.parent-line {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
  margin-bottom: 14px;
}
.fields {
  display: flex;
  flex-direction: column;
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
