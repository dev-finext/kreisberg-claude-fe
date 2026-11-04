<script setup>
import { useRouter } from "vue-router";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";

const ui = useUiStore();
const router = useRouter();

const GLYPH = { success: "check", warning: "alert", error: "alert", info: "info" };

function follow(t) {
  ui.dismissToast(t.id);
  if (t.action?.to) router.push(t.action.to);
}
</script>

<template>
  <!-- top-left of the window, out of the way of the RTL content and the rail -->
  <div class="toast-host">
    <transition-group name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="'toast-' + t.type">
        <span class="toast-icon">
          <AppIcon :name="GLYPH[t.type] || 'info'" :size="12" />
        </span>
        <span class="toast-text">{{ t.text }}</span>
        <button v-if="t.action" class="toast-action" @click="follow(t)">{{ t.action.label }}</button>
        <button class="toast-close" title="סגירה" @click="ui.dismissToast(t.id)">
          <AppIcon name="cancel" :size="14" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 16px;
  left: 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  /* RTL: flex-end is the left edge, so the stack lines up under the first one */
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  max-width: 360px;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(11, 27, 54, 0.18);
  padding: 8px 10px 8px 8px;
  /* the status colour reads off the leading (right, in RTL) edge */
  border-right: 3px solid var(--toast-accent);
  --toast-accent: var(--brand-primary);
}
.toast-success {
  --toast-accent: #3e841e;
}
.toast-warning,
.toast-error {
  --toast-accent: var(--danger);
}
/* filled status dot with a white glyph */
.toast-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--toast-accent);
}
.toast-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 17px;
  color: var(--text-primary);
  text-align: right;
}
.toast-action {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  color: var(--brand-primary);
}
.toast-action:hover {
  text-decoration: underline;
}
.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 2px;
  display: inline-flex;
}
.toast-close:hover {
  color: var(--text-primary);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
