<script setup>
import AppIcon from "@/components/shared/AppIcon.vue";

defineProps({
  title: { type: String, required: true },
  width: { type: String, default: "477px" },
  confirmLabel: { type: String, default: "אישור" },
  cancelLabel: { type: String, default: "ביטול" },
  confirmDisabled: { type: Boolean, default: false },
  hideFooter: { type: Boolean, default: false },
});
const emit = defineEmits(["close", "confirm"]);
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @mousedown.self="emit('close')">
      <div class="modal" :style="{ width }">
        <div class="modal-header">
          <button class="modal-close" @click="emit('close')">
            <AppIcon name="cancel" :size="20" />
          </button>
          <div class="modal-title-wrap">
            <h2 class="modal-title">{{ title }}</h2>
            <slot name="subtitle" />
          </div>
        </div>
        <div class="modal-divider" />
        <div class="modal-body scroll-slim">
          <slot />
        </div>
        <div v-if="!hideFooter" class="modal-footer">
          <div class="modal-footer-start">
            <button class="btn btn-primary" :disabled="confirmDisabled" @click="emit('confirm')">
              {{ confirmLabel }}
            </button>
            <button class="btn btn-secondary" @click="emit('close')">{{ cancelLabel }}</button>
          </div>
          <div class="modal-footer-end">
            <slot name="footer-extra" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 44, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.modal {
  background: var(--surface);
  border-radius: var(--radius-modal);
  padding: 8px 0 24px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-modal);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  padding: 8px 32px;
}
.modal-title-wrap {
  text-align: right;
}
.modal-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  color: var(--text-secondary);
}
.modal-close {
  background: none;
  border: none;
  color: var(--text-primary);
  display: inline-flex;
  padding: 2px;
}
.modal-divider {
  height: 1.5px;
  background: var(--divider);
  width: 100%;
}
.modal-body {
  padding: 24px 32px;
  overflow-y: auto;
  flex: 1;
}
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  padding: 0 32px;
}
.modal-footer-start {
  display: flex;
  gap: 12px;
}
</style>
