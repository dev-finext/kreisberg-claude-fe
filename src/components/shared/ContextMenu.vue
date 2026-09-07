<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const props = defineProps({
  /** [{key, label, icon, danger, disabled}] */
  items: { type: Array, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
});
const emit = defineEmits(["select", "close"]);
const menuEl = ref(null);

function onDocClick(e) {
  if (menuEl.value && !menuEl.value.contains(e.target)) emit("close");
}
onMounted(() => document.addEventListener("mousedown", onDocClick));
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocClick));
</script>

<template>
  <Teleport to="body">
    <div ref="menuEl" class="ctx-menu" :style="{ top: y + 'px', left: x + 'px' }">
      <button
        v-for="it in items"
        :key="it.key"
        class="ctx-item"
        :class="{ danger: it.danger, disabled: it.disabled }"
        :disabled="it.disabled"
        @click="emit('select', it.key)"
      >
        <AppIcon :name="it.icon" :size="24" />
        <span class="ctx-label">{{ it.label }}</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 80;
  background: var(--surface);
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ctx-item {
  display: flex;
  align-items: center;
  justify-content: flex-start; /* icon hugs the right edge, label to its left (Figma "menu edit") */
  gap: 8px;
  height: 24px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  letter-spacing: 0.12px;
  color: var(--text-primary);
}
.ctx-item:hover:not(.disabled) {
  background: var(--surface-subtle);
}
.ctx-item.danger {
  color: var(--danger);
}
.ctx-item.disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}
.ctx-label {
  text-align: right;
}
</style>
