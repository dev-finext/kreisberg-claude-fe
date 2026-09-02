<script setup>
import { ref, computed } from "vue";
import { useBoqStore } from "@/stores/boq";
import { useCatalogStore } from "@/stores/catalog";
import { useDbStore } from "@/stores/db";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";

const boq = useBoqStore();
const cat = useCatalogStore();
const db = useDbStore();

const openKey = ref(null);

/** filter definitions per mode; each option list is computed from current BOQ content */
const defs = computed(() => {
  const inBoqItems = [...boq.itemIdsInBoq()].map((id) => cat.item(id)).filter(Boolean);
  const chapters = [...new Set(inBoqItems.map((i) => i.chapterId))].map((id) => cat.chapter(id)).filter(Boolean);
  const subs = [...new Set(inBoqItems.map((i) => i.subChapterId))].map((id) => cat.subChapter(id)).filter(Boolean);
  const priorities = [
    { value: "mandatory", label: "חובה" },
    { value: "recommended", label: "מומלץ" },
    { value: "optional", label: "לא חובה" },
  ];
  const summary = [
    { value: "true", label: "לסיכום" },
    { value: "false", label: "לא לסיכום" },
  ];
  const rts = db.resourceTypes.map((r) => ({ value: String(r.id), label: r.name }));
  const resources = db.constructors.map((c) => ({ value: String(c.id), label: c.name }));
  const names = inBoqItems.slice(0, 30).map((i) => ({ value: String(i.id), label: i.name }));

  if (boq.sidebarMode === "assignment") {
    return [
      { key: "chapter", label: "פרק", options: chapters.map((c) => ({ value: String(c.id), label: `${c.num}: ${c.name}` })) },
      { key: "subChapter", label: "תת פרק", options: subs.map((s) => ({ value: String(s.id), label: `${s.num}-${s.name}` })) },
      { key: "itemName", label: "שם סעיף", options: names },
      { key: "resourceType", label: "סוג משאב", options: rts },
      { key: "priority", label: "עדיפות", options: priorities },
      { key: "summary", label: "לסיכום", options: summary },
    ];
  }
  return [
    { key: "priority", label: "עדיפות", options: priorities },
    { key: "resourceType", label: "סוג משאב", options: rts },
    { key: "resource", label: "משאב", options: resources },
    { key: "summary", label: "לסיכום", options: summary },
  ];
});

function selectionOf(key) {
  return boq.filters[key] || [];
}
function valueLabel(def) {
  const sel = selectionOf(def.key);
  if (!sel.length) return "הכל";
  if (sel.length === 1) return def.options.find((o) => o.value === sel[0])?.label || "הכל";
  return `${sel.length} נבחרו`;
}
function toggleOption(def, opt, v) {
  const sel = [...selectionOf(def.key)];
  const i = sel.indexOf(opt.value);
  if (v && i < 0) sel.push(opt.value);
  if (!v && i >= 0) sel.splice(i, 1);
  boq.filters = { ...boq.filters, [def.key]: sel };
}
function setAll(def, v) {
  boq.filters = { ...boq.filters, [def.key]: v ? [] : [] };
  if (!v) openKey.value = null;
}
function clearAll() {
  boq.filters = {};
  boq.searchTerm = "";
}
</script>

<template>
  <div class="filter-row">
    <div class="filters">
      <div v-for="def in defs" :key="def.key" class="filter">
        <button class="filter-btn" @click.stop="openKey = openKey === def.key ? null : def.key">
          <span class="f-label">{{ def.label }}</span>
          <span class="f-value">{{ valueLabel(def) }}</span>
          <AppIcon name="chevron-down" :size="14" />
        </button>
        <div v-if="openKey === def.key" class="filter-menu scroll-slim" @mouseleave="openKey = null">
          <label class="f-opt">
            <BaseCheckbox size="small" :model-value="!selectionOf(def.key).length" @update:model-value="(v) => setAll(def, v)" />
            <span>הכל</span>
          </label>
          <div class="f-divider" />
          <label v-for="opt in def.options" :key="opt.value" class="f-opt">
            <BaseCheckbox
              size="small"
              :model-value="selectionOf(def.key).includes(opt.value)"
              @update:model-value="(v) => toggleOption(def, opt, v)"
            />
            <span class="ellipsis">{{ opt.label }}</span>
          </label>
        </div>
      </div>
    </div>
    <div class="filter-actions">
      <button class="btn-text" @click="clearAll">ניקוי</button>
      <button class="filter-chip">סינון</button>
    </div>
  </div>
</template>

<style scoped>
.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  min-height: 48px;
  margin-bottom: 10px;
}
.filters {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.filter {
  position: relative;
}
.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-size: 13px;
  color: var(--text-secondary);
}
.f-label {
  color: var(--text-secondary);
}
.f-value {
  color: var(--text-primary);
  font-weight: 600;
}
.filter-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 30;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-menu);
  padding: 6px;
  width: 210px;
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.f-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  font-size: 13px;
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
}
.f-opt:hover {
  background: var(--surface-subtle);
}
.f-divider {
  height: 1px;
  background: var(--divider);
  margin: 3px 0;
}
.filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row-reverse;
}
.filter-chip {
  background: var(--brand-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-pill);
  height: 30px;
  padding: 0 18px;
  font-size: 12px;
  font-weight: 600;
}
</style>
