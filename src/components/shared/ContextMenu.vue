<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const props = defineProps({
  /** [{key, label, icon, danger, disabled}] */
  items: { type: Array, required: true },
  /** fallback position, used when there is no anchor */
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  /**
   * The button the menu belongs to, as a plain {left, right, top, bottom}
   * (see anchorRect). The menu opens below it and to its left, as the menus
   * always have; where the left has no room it opens to the button's right,
   * and where the bottom has none, above it — so it never leaves the window.
   */
  anchor: { type: Object, default: null },
});
const emit = defineEmits(["select", "close"]);
const menuEl = ref(null);

const GAP = 4;
const EDGE = 8;
const pos = ref({ left: props.x, top: props.y });
const placed = ref(false);

function place() {
  const el = menuEl.value;
  if (!el) return;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = props.x;
  let top = props.y;
  const a = props.anchor;
  if (a) {
    left = a.left - w - GAP;
    if (left < EDGE) left = a.right + GAP;
    top = a.bottom + GAP;
    if (vh && top + h > vh - EDGE) top = a.top - h - GAP;
  }
  /* whatever was asked for, the menu stays inside the window */
  if (vw) left = Math.min(Math.max(left, EDGE), Math.max(EDGE, vw - w - EDGE));
  if (vh) top = Math.min(Math.max(top, EDGE), Math.max(EDGE, vh - h - EDGE));
  pos.value = { left, top };
  placed.value = true;
}
watch(
  () => [props.x, props.y, props.anchor],
  () => nextTick(place)
);

function onDocClick(e) {
  if (menuEl.value && !menuEl.value.contains(e.target)) emit("close");
}
onMounted(() => {
  document.addEventListener("mousedown", onDocClick);
  place();
});
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocClick));
</script>

<template>
  <Teleport to="body">
    <div
      ref="menuEl"
      class="ctx-menu"
      :style="{ top: pos.top + 'px', left: pos.left + 'px', visibility: placed ? 'visible' : 'hidden' }"
    >
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
  white-space: nowrap;
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
