<script setup>
import { useRouter } from "vue-router";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";

const ui = useUiStore();
const router = useRouter();

function follow(t) {
  ui.dismissToast(t.id);
  if (t.action?.to) router.push(t.action.to);
}
</script>

<template>
  <!-- Figma "Toast message": 627x72 on #F6F9FD, centred over the page, 67px up -->
  <div class="toast-host" :style="{ marginRight: ui.railExpanded ? '240px' : 'var(--rail-w)' }">
    <transition-group name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="'toast-' + t.type">
        <span class="toast-icon">
          <AppIcon :name="t.type === 'success' ? 'check' : 'alert'" :size="14" />
        </span>
        <span class="toast-text">{{ t.text }}</span>
        <button v-if="t.action" class="toast-action" @click="follow(t)">{{ t.action.label }}</button>
        <button class="toast-close" title="סגירה" @click="ui.dismissToast(t.id)">
          <AppIcon name="cancel" :size="24" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  bottom: 67px;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 16px;
  width: 627px;
  max-width: calc(100vw - 48px);
  min-height: 72px;
  background: var(--brand-primary-soft);
  border-radius: 6px;
  box-shadow: 0 2px 4.6px rgba(0, 0, 0, 0.36);
  padding: 24px 32px;
}
/* filled status dot with a white glyph */
.toast-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #3e841e;
}
.toast-warning .toast-icon,
.toast-error .toast-icon {
  background: var(--danger);
}
.toast-text {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  color: var(--text-primary);
  text-align: right;
}
.toast-action {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 14px;
  line-height: 18px;
  color: var(--brand-primary);
}
.toast-action:hover {
  text-decoration: underline;
}
.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-primary);
  padding: 0;
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
