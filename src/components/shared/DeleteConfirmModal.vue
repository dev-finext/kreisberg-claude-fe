<script setup>
import BaseModal from "@/components/shared/BaseModal.vue";

defineProps({
  title: { type: String, required: true },
  message: { type: String, required: true },
  detail: { type: String, default: "" },
  confirmLabel: { type: String, default: "מחיקה" },
});
const emit = defineEmits(["close", "confirm"]);
</script>

<template>
  <BaseModal
    :title="title"
    width="420px"
    :confirm-label="confirmLabel"
    @close="emit('close')"
    @confirm="emit('confirm')"
  >
    <p class="msg">{{ message }}</p>
    <p v-if="detail" class="detail">{{ detail }}</p>
  </BaseModal>
</template>

<style scoped>
.msg {
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
}
.detail {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
}
</style>
