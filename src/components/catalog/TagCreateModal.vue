<script setup>
import { ref, computed, nextTick, onMounted } from "vue";
import { useDbStore } from "@/stores/db";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import SearchPill from "@/components/shared/SearchPill.vue";
import { useEscape } from "@/composables/useEscape";
import { stripHtml } from "@/utils/html";

const props = defineProps({
  /** item ids ticked in the catalog table when the popup was opened */
  preselected: { type: Array, default: () => [] },
});
const emit = defineEmits(["close", "created"]);
useEscape(() => emit("close"));

const db = useDbStore();
const cat = useCatalogStore();
const ui = useUiStore();

/* ---------- tag name: pick an existing tag or type a new one ---------- */
const name = ref("");
const nameOpen = ref(false);
const nameInput = ref(null);
const nameMatches = computed(() => {
  const q = name.value.trim();
  return db.tags.filter((t) => !q || t.name.includes(q));
});
const existingTag = computed(() => db.tags.find((t) => t.name === name.value.trim()) || null);
function pickName(t) {
  name.value = t.name;
  nameOpen.value = false;
}

/* ---------- filters ---------- */
const tab = ref("all"); // 'all' | 'picked'
const chapterId = ref("");
const subChapterId = ref("");
const term = ref("");
const applied = ref("");
const subOptions = computed(() =>
  chapterId.value
    ? cat.chapter(Number(chapterId.value))?.subChapters || []
    : cat.chapters.flatMap((c) => c.subChapters)
);
function clearFilters() {
  chapterId.value = "";
  subChapterId.value = "";
  term.value = "";
  applied.value = "";
}
function runSearch() {
  applied.value = term.value.trim();
}

/* ---------- selection ---------- */
const checked = ref([...props.preselected]);
const expanded = ref([]);
function isOpen(key) {
  return expanded.value.includes(key);
}
function toggleOpen(key) {
  const i = expanded.value.indexOf(key);
  if (i >= 0) expanded.value.splice(i, 1);
  else expanded.value.push(key);
}
function setItems(ids, v) {
  checked.value = v
    ? [...new Set([...checked.value, ...ids])]
    : checked.value.filter((id) => !ids.includes(id));
}

/* rows: chapter → sub-chapter → item, filtered by the bar above */
const tree = computed(() => {
  const q = applied.value;
  const out = [];
  for (const ch of cat.chapters) {
    if (chapterId.value && ch.id !== Number(chapterId.value)) continue;
    const subs = [];
    for (const sc of ch.subChapters) {
      if (subChapterId.value && sc.id !== Number(subChapterId.value)) continue;
      let items = sc.items.filter((i) => !i.isNote);
      if (tab.value === "picked") items = items.filter((i) => checked.value.includes(i.id));
      if (q)
        items = items.filter(
          (i) => i.name.includes(q) || i.code.includes(q) || stripHtml(i.description).includes(q)
        );
      if (items.length) subs.push({ sub: sc, items });
    }
    if (subs.length) out.push({ chapter: ch, subs });
  }
  return out;
});
const rows = computed(() => {
  const out = [];
  for (const g of tree.value) {
    const chIds = g.subs.flatMap((s) => s.items.map((i) => i.id));
    out.push({
      kind: "chapter",
      key: `c${g.chapter.id}`,
      label: `פרק ${g.chapter.num}-${g.chapter.name}`,
      ids: chIds,
    });
    if (!isOpen(`c${g.chapter.id}`)) continue;
    for (const s of g.subs) {
      const sIds = s.items.map((i) => i.id);
      out.push({
        kind: "sub",
        key: `s${s.sub.id}`,
        label: `תת פרק ${s.sub.num}- ${s.sub.name}`,
        ids: sIds,
      });
      if (!isOpen(`s${s.sub.id}`)) continue;
      for (const i of s.items)
        out.push({ kind: "item", key: `i${i.id}`, label: stripHtml(i.description) || i.name, ids: [i.id] });
    }
  }
  return out;
});
function rowChecked(r) {
  return r.ids.length > 0 && r.ids.every((id) => checked.value.includes(id));
}
const canCreate = computed(() => !!name.value.trim() && checked.value.length > 0);

function create() {
  const label = name.value.trim();
  if (!label || !checked.value.length) return;
  let tag = existingTag.value;
  if (!tag) {
    tag = { id: db.nextId("tags"), name: label };
    db.db.tags.push(tag);
  }
  for (const id of checked.value) {
    const it = cat.item(id);
    if (it && !it.tags.includes(tag.id)) it.tags.push(tag.id);
  }
  db.persist();
  ui.toast(`התגית "${label}" שויכה ל-${checked.value.length} סעיפים`);
  emit("created", tag);
}

onMounted(() => {
  /* open the branches that hold the pre-ticked items */
  for (const ch of cat.chapters)
    for (const sc of ch.subChapters)
      if (sc.items.some((i) => checked.value.includes(i.id))) {
        if (!isOpen(`c${ch.id}`)) expanded.value.push(`c${ch.id}`);
        if (!isOpen(`s${sc.id}`)) expanded.value.push(`s${sc.id}`);
      }
  if (!expanded.value.length && cat.chapters[0]) expanded.value.push(`c${cat.chapters[0].id}`);
  nextTick(() => nameInput.value?.focus());
});
</script>

<template>
  <Teleport to="body">
    <div class="tc-overlay" @mousedown.self="emit('close')">
      <!-- Figma "BoQ popup adding sections": 904 × 587 -->
      <div class="tc">
        <div class="tc-head">
          <h2 class="tc-title">יצירת תגית חדשה</h2>
          <button class="icon-btn" title="סגירה" @click="emit('close')">
            <AppIcon name="cancel" :size="24" />
          </button>
        </div>
        <div class="tc-divider" />

        <div class="tc-body">
          <!-- name + filter bar -->
          <div class="head-block">
            <div class="name-row">
              <span class="name-lbl">שם התגית:</span>
              <div class="name-combo">
                <input
                  ref="nameInput"
                  v-model="name"
                  class="input name-input"
                  placeholder="עדכן שם"
                  @focus="nameOpen = true"
                  @blur="nameOpen = false"
                />
                <button class="caret" title="תגיות קיימות" @mousedown.prevent="nameOpen = !nameOpen">
                  <AppIcon name="chevron-down" :size="24" />
                </button>
                <div v-if="nameOpen && nameMatches.length" class="name-menu scroll-slim">
                  <button
                    v-for="t in nameMatches"
                    :key="t.id"
                    class="name-opt"
                    @mousedown.prevent="pickName(t)"
                  >
                    {{ t.name }}
                  </button>
                </div>
              </div>
            </div>

            <div class="filter-row">
              <div class="fg">
                <span class="fg-lbl">סינון לפי:</span>
                <select v-model="chapterId" class="select sel" @change="subChapterId = ''">
                  <option value="">בחר פרק</option>
                  <option v-for="c in cat.chapters" :key="c.id" :value="c.id">
                    {{ c.num }} - {{ c.name }}
                  </option>
                </select>
                <select v-model="subChapterId" class="select sel">
                  <option value="">בחר תת-פרק</option>
                  <option v-for="s in subOptions" :key="s.id" :value="s.id">
                    {{ s.num }} - {{ s.name }}
                  </option>
                </select>
                <button class="clear-link" @click="clearFilters">נקה</button>
              </div>
              <div class="fg">
                <span class="fg-lbl">סעיפים:</span>
                <div class="tabs">
                  <button class="tab" :class="{ on: tab === 'picked' }" @click="tab = 'picked'">נבחר</button>
                  <button class="tab" :class="{ on: tab === 'all' }" @click="tab = 'all'">הכל</button>
                </div>
              </div>
              <SearchPill
                v-model="term"
                width="224px"
                placeholder="חיפוש פרק/סעיף/תת סעיף"
                @submit="runSearch"
              />
            </div>
          </div>

          <!-- tree of chapters / sub-chapters / items -->
          <div class="tc-list scroll-slim">
            <div v-for="r in rows" :key="r.key" class="tc-row" :class="r.kind">
              <span v-if="r.kind !== 'item'" class="chev" @click="toggleOpen(r.key)">
                <AppIcon :name="isOpen(r.key) ? 'chevron-down' : 'chevron-left'" :size="16" />
              </span>
              <BaseCheckbox
                size="small"
                :model-value="rowChecked(r)"
                @update:model-value="(v) => setItems(r.ids, v)"
              />
              <span class="tc-label ellipsis">{{ r.label }}</span>
            </div>
            <p v-if="!rows.length" class="tc-empty">
              {{ tab === "picked" ? "לא נבחרו סעיפים" : "אין סעיפים התואמים לסינון" }}
            </p>
          </div>

          <div class="tc-foot">
            <button class="btn btn-primary" :disabled="!canCreate" @click="create">
              {{ existingTag ? "שיוך תגית" : "יצירת תגית" }}
            </button>
            <button class="btn btn-secondary" @click="emit('close')">ביטול</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 44, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 70;
}
.tc {
  width: 904px;
  max-width: 96vw;
  height: 587px;
  max-height: 92vh;
  background: var(--surface);
  border-radius: 6px;
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  padding: 8px 0 0;
  gap: 8px;
}
.tc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 8px;
  margin: 0 24px;
}
.tc-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  color: var(--text-secondary);
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  display: inline-flex;
  padding: 0;
}
.tc-divider {
  height: 1px;
  background: var(--divider);
}
.tc-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px 24px 24px;
}
.head-block {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
/* "שם התגית:" label with a combo to its left */
.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 344px;
}
.name-lbl {
  font-size: 14px;
  line-height: 18px;
  color: #07090d;
  white-space: nowrap;
}
.name-combo {
  position: relative;
  width: 264px;
}
.name-input {
  width: 100%;
  padding-left: 32px;
}
.caret {
  position: absolute;
  left: 8px;
  top: 8px;
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
  padding: 0;
}
.name-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 5;
  max-height: 200px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(16, 37, 86, 0.14);
  padding: 4px;
  display: flex;
  flex-direction: column;
}
.name-opt {
  background: none;
  border: none;
  border-radius: 6px;
  padding: 0 10px;
  height: 32px;
  font-size: 14px;
  font-family: inherit;
  color: var(--text-primary);
  text-align: right;
}
.name-opt:hover {
  background: var(--brand-primary-soft);
}
/* filter bar: סינון group, סעיפים tabs, search pill (right → left) */
.filter-row {
  display: flex;
  align-items: center;
  gap: 35px;
}
.fg {
  display: flex;
  align-items: center;
  gap: 16px;
}
.fg-lbl {
  font-size: 14px;
  line-height: 18px;
  color: var(--text-primary);
  white-space: nowrap;
}
.sel {
  width: 128px;
}
.clear-link {
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 14px;
  font-family: inherit;
  padding: 0;
}
.tabs {
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--page-bg);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  height: 34px;
  padding: 5px 6px;
  gap: 4px;
}
.tab {
  height: 24px;
  min-width: 46px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: none;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: var(--text-secondary);
}
.tab.on {
  background: var(--page-bg);
  color: #315583;
}
/* rows */
.tc-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
}
.tc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  background: var(--surface);
  border: 1px solid #eaeffb;
  border-radius: 6px;
  box-shadow: 0 2px 3px rgba(16, 37, 86, 0.08);
  padding: 0 24px 0 24px;
  flex-shrink: 0;
}
.tc-row.sub {
  padding-right: 48px;
}
.tc-row.item {
  padding-right: 80px;
}
.chev {
  display: inline-flex;
  color: var(--text-secondary);
  cursor: pointer;
}
.tc-label {
  font-size: 14px;
  line-height: 18px;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  text-align: right;
}
.tc-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  padding: 24px 0;
}
/* יצירת תגית on the left, ביטול beside it */
.tc-foot {
  display: flex;
  gap: 12px;
  flex-direction: row-reverse;
  justify-content: flex-start;
}
</style>
