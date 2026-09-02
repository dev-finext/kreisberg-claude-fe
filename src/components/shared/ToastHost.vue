<script setup>
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";

const ui = useUiStore();
</script>

<template>
  <div class="toast-host">
    <transition-group name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="'toast-' + t.type">
        <button class="toast-close" @click="ui.dismissToast(t.id)">
          <AppIcon name="cancel" :size="16" />
        </button>
        <span class="toast-text">{{ t.text }}</span>
        <span class="toast-icon">
          <AppIcon :name="t.type === 'success' ? 'check-circle' : 'alert-circle'" :size="22" />
        </span>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-menu);
  padding: 12px 16px;
  min-width: 260px;
  justify-content: flex-end;
}
.toast-icon {
  display: inline-flex;
}
.toast-success .toast-icon {
  color: #357826;
}
.toast-warning .toast-icon,
.toast-error .toast-icon {
  color: var(--danger);
}
.toast-text {
  font-size: 14px;
  color: var(--text-primary);
  flex: 1;
  text-align: right;
}
.toast-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 2px;
  display: inline-flex;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
