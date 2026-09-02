<script setup>
import { computed } from "vue";

const props = defineProps({
  sla: { type: Object, required: true }, // {late, near, ok}
});

const total = computed(() => props.sla.late + props.sla.near + props.sla.ok);
const R = 14;
const C = 2 * Math.PI * R;

const segments = computed(() => {
  if (!total.value) return [];
  const parts = [
    { key: "late", value: props.sla.late, color: "var(--danger)" },
    { key: "near", value: props.sla.near, color: "var(--warning)" },
    { key: "ok", value: props.sla.ok, color: "var(--success)" },
  ].filter((p) => p.value > 0);
  let offset = 0;
  return parts.map((p) => {
    const len = (p.value / total.value) * C;
    const seg = { ...p, dasharray: `${len} ${C - len}`, dashoffset: -offset };
    offset += len;
    return seg;
  });
});
</script>

<template>
  <div class="sla">
    <div class="legend">
      <div class="legend-row">
        <span class="count num">{{ sla.late }}</span
        ><span class="lbl">חורג</span><span class="dot" style="background: var(--danger)" />
      </div>
      <div class="legend-row">
        <span class="count num">{{ sla.near }}</span
        ><span class="lbl">קרוב לחריגה</span><span class="dot" style="background: var(--warning)" />
      </div>
      <div class="legend-row">
        <span class="count num">{{ sla.ok }}</span
        ><span class="lbl">עומד בזמנים</span><span class="dot" style="background: var(--success)" />
      </div>
    </div>
    <svg width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" :r="R" fill="none" stroke="var(--divider)" stroke-width="4" />
      <circle
        v-for="s in segments"
        :key="s.key"
        cx="17"
        cy="17"
        :r="R"
        fill="none"
        :stroke="s.color"
        stroke-width="4"
        :stroke-dasharray="s.dasharray"
        :stroke-dashoffset="s.dashoffset"
        transform="rotate(-90 17 17)"
      />
      <text x="17" y="21" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-primary)">
        {{ total }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.sla {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row-reverse;
  justify-content: flex-end;
}
.legend {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-secondary);
  justify-content: flex-end;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.lbl {
  min-width: 70px;
  text-align: right;
}
.count {
  color: var(--text-primary);
}
</style>
