<script setup>
import { ref, computed, watch } from "vue";
import { useCatalogStore } from "@/stores/catalog";
import AppIcon from "@/components/shared/AppIcon.vue";
import { useEscape } from "@/composables/useEscape";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import SearchPill from "@/components/shared/SearchPill.vue";
import PickerCombo from "./PickerCombo.vue";
import EmptyClipboard from "@/components/shared/EmptyClipboard.vue";

const props = defineProps({
  mode: { type: String, default: "multi" }, // 'multi' | 'single'
  catalogName: { type: String, default: "" },
  alreadySelected: { type: Array, default: () => [] },
});
const emit = defineEmits(["close", "picked"]);
useEscape(() => emit("close"));

const cat = useCatalogStore();

const chapterId = ref(null);
const subChapterId = ref(null);
const tagId = ref(null);
const term = ref("");
const searched = ref(false);
const results = ref({ items: [], groups: [] });
const selection = ref(new Set());
const activeGroupId = ref(null);
const resultsPane = ref(null);

const alreadySet = computed(() => new Set(props.alreadySelected));

/* combo options — sorted alphabetically per spec */
const chapterOptions = computed(() =>
  cat.chaptersSorted().map((c) => ({ value: c.id, label: `${c.num}- ${c.name}` }))
);
const subChapterOptions = computed(() =>
  chapterId.value
    ? cat.subChaptersOf(chapterId.value).map((s) => ({ value: s.id, label: `${s.num} - ${s.name}` }))
    : []
);
const tagOptions = computed(() =>
  cat
    .tagsInScope({ chapterId: chapterId.value, subChapterId: subChapterId.value })
    .map((t) => ({ value: t.id, label: t.name }))
);

/* cascade: chapter change resets sub-chapter; tag resets silently when irrelevant */
watch(chapterId, () => {
  subChapterId.value = null;
});
watch([chapterId, subChapterId], () => {
  if (tagId.value && !tagOptions.value.some((o) => o.value === tagId.value)) tagId.value = null;
});

const canSearch = computed(() => chapterId.value || subChapterId.value || tagId.value || term.value.trim());

function runSearch() {
  if (!canSearch.value) return;
  results.value = cat.pickerSearch({
    chapterId: chapterId.value,
    subChapterId: subChapterId.value,
    tagId: tagId.value,
    term: "",
  });
  searched.value = true;
}
function clearAll() {
  chapterId.value = null;
  subChapterId.value = null;
  tagId.value = null;
  term.value = "";
  searched.value = false;
  results.value = { items: [], groups: [] };
}

/* free text filters *within* returned results, live */
const visibleGroups = computed(() => {
  const t = term.value.trim().toLowerCase();
  if (!searched.value) return [];
  return results.value.groups
    .map((g) => ({
      ...g,
      subGroups: g.subGroups
        .map((sg) => ({
          ...sg,
          items: sg.items.filter(
            (i) =>
              !t ||
              i.code.toLowerCase().includes(t) ||
              (i.name || "").toLowerCase().includes(t) ||
              (i.unit || "").toLowerCase().includes(t)
          ),
        }))
        .filter((sg) => sg.items.length),
    }))
    .filter((g) => g.subGroups.length);
});
const visibleItems = computed(() => visibleGroups.value.flatMap((g) => g.subGroups.flatMap((s) => s.items)));
const showTree = computed(
  () => visibleGroups.value.length > 1 || visibleGroups.value.some((g) => g.subGroups.length > 1)
);

function highlight(name) {
  const t = term.value.trim();
  if (!t) return escapeHtml(name);
  const idx = name.indexOf(t);
  if (idx < 0) return escapeHtml(name);
  return (
    escapeHtml(name.slice(0, idx)) +
    '<mark class="hl">' +
    escapeHtml(name.slice(idx, idx + t.length)) +
    "</mark>" +
    escapeHtml(name.slice(idx + t.length))
  );
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* selection */
function isDisabled(item) {
  return alreadySet.value.has(item.id);
}
function isChecked(item) {
  return selection.value.has(item.id) || isDisabled(item);
}
function toggleItem(item) {
  if (isDisabled(item)) return;
  const next = new Set(selection.value);
  if (props.mode === "single") {
    next.clear();
    if (!selection.value.has(item.id)) next.add(item.id);
  } else if (next.has(item.id)) {
    next.delete(item.id);
  } else {
    next.add(item.id);
  }
  selection.value = next;
}
function selectAll() {
  const next = new Set(selection.value);
  for (const i of visibleItems.value) if (!isDisabled(i)) next.add(i.id);
  selection.value = next;
}
function clearSelection() {
  selection.value = new Set();
}

function scrollToGroup(gId) {
  activeGroupId.value = gId;
  const el = resultsPane.value?.querySelector(`[data-group="${gId}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function confirm() {
  if (!selection.value.size) return;
  emit("picked", [...selection.value]);
}
</script>

<template>
  <Teleport to="body">
    <div class="picker-overlay" @mousedown.self="emit('close')">
      <div class="picker">
        <!-- header -->
        <div class="picker-header">
          <div class="ph-start">
            <button class="icon-btn" @click="emit('close')"><AppIcon name="cancel" :size="20" /></button>
            <span class="ph-catalog">{{ catalogName }}</span>
          </div>
          <h2 class="ph-title">בחירת סעיפים</h2>
        </div>
        <div class="picker-divider" />

        <!-- filters -->
        <div class="picker-filters">
          <div class="combos">
            <PickerCombo v-model="tagId" :options="tagOptions" placeholder="הקלד או בחר תגית" />
            <PickerCombo
              v-model="subChapterId"
              :options="subChapterOptions"
              :placeholder="chapterId ? 'כל תתי הפרקים' : 'בחר פרק תחילה'"
              :disabled="!chapterId"
            />
            <PickerCombo v-model="chapterId" :options="chapterOptions" placeholder="הקלד או בחר פרק" />
          </div>
          <div class="search-row">
            <div class="sr-start">
              <button class="btn btn-primary search-btn" :disabled="!canSearch" @click="runSearch">
                חיפוש
              </button>
              <button
                class="btn-text"
                :class="{ 'text-disabled': !canSearch && !searched }"
                @click="clearAll"
              >
                ניקוי
              </button>
            </div>
            <SearchPill
              v-model="term"
              class="pill-wide"
              placeholder="חיפוש סעיפים"
              width="568px"
              @submit="runSearch"
            />
          </div>
        </div>

        <!-- results header -->
        <div v-if="searched" class="results-meta">
          <span
            >נמצאו <span class="num">{{ visibleItems.length }}</span> סעיפים</span
          >
          <div class="rm-actions">
            <button v-if="mode === 'multi'" class="btn-text" @click="selectAll">בחר הכל</button>
            <button class="btn-text" @click="clearSelection">נקה</button>
          </div>
        </div>

        <!-- body -->
        <div class="picker-body">
          <div v-if="!searched" class="picker-empty">
            <EmptyClipboard />
            <p class="empty-title">עדיין אין כאן סעיפים</p>
            <p class="empty-sub">בחר פילטרים ולחץ על "חיפוש" כדי להציג סעיפים</p>
          </div>
          <div v-else-if="!visibleItems.length" class="picker-empty">
            <EmptyClipboard />
            <p class="empty-title">לא נמצאו סעיפים התואמים לחיפוש</p>
          </div>
          <template v-else>
            <!-- results table -->
            <div ref="resultsPane" class="results-pane scroll-slim">
              <table class="results-table">
                <thead>
                  <tr>
                    <th class="th-check">
                      <BaseCheckbox
                        v-if="mode === 'multi'"
                        :model-value="false"
                        @update:model-value="selectAll"
                      />
                    </th>
                    <th>מספר סעיף</th>
                    <th>שם סעיף</th>
                    <th>יח' מידה</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="g in visibleGroups" :key="g.chapter.id">
                    <tr class="r-group" :data-group="'c' + g.chapter.id">
                      <td colspan="4">פרק {{ g.chapter.num }} - {{ g.chapter.name }}</td>
                    </tr>
                    <template v-for="sg in g.subGroups" :key="sg.subChapter.id">
                      <tr class="r-group sub" :data-group="'s' + sg.subChapter.id">
                        <td colspan="4">תת פרק {{ sg.subChapter.num }} - {{ sg.subChapter.name }}</td>
                      </tr>
                      <tr
                        v-for="item in sg.items"
                        :key="item.key"
                        class="r-row"
                        :class="{ disabled: isDisabled(item), checked: isChecked(item) && !isDisabled(item) }"
                        @click="toggleItem(item)"
                      >
                        <td class="td-check">
                          <span
                            v-if="mode === 'single'"
                            class="radio"
                            :class="{ checked: isChecked(item) }"
                          />
                          <BaseCheckbox
                            v-else
                            :model-value="isChecked(item)"
                            :disabled="isDisabled(item)"
                            @update:model-value="() => toggleItem(item)"
                          />
                        </td>
                        <td>
                          <span class="item-code">{{ item.code }}</span>
                        </td>
                        <td class="r-name">
                          <span v-html="highlight(item.name)" />
                          <span v-if="isDisabled(item)" class="already">כבר נבחר</span>
                        </td>
                        <td>{{ item.unit }}</td>
                      </tr>
                    </template>
                  </template>
                </tbody>
              </table>
            </div>
            <!-- chapter tree with counts -->
            <div v-if="showTree" class="tree-pane scroll-slim">
              <div v-for="g in visibleGroups" :key="g.chapter.id">
                <button
                  class="tp-row"
                  :class="{ active: activeGroupId === 'c' + g.chapter.id }"
                  @click="scrollToGroup('c' + g.chapter.id)"
                >
                  <span class="tp-count num"
                    >({{ g.subGroups.reduce((n, s) => n + s.items.length, 0) }})</span
                  >
                  <span class="ellipsis">{{ g.chapter.num }}: {{ g.chapter.name }}</span>
                  <AppIcon name="chevron-down" :size="14" />
                </button>
                <button
                  v-for="sg in g.subGroups"
                  :key="sg.subChapter.id"
                  class="tp-row sub"
                  :class="{ active: activeGroupId === 's' + sg.subChapter.id }"
                  @click="scrollToGroup('s' + sg.subChapter.id)"
                >
                  <span class="tp-count num">({{ sg.items.length }})</span>
                  <span class="ellipsis">{{ sg.subChapter.num }} - {{ sg.subChapter.name }}</span>
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- footer -->
        <div class="picker-footer">
          <div class="pf-start">
            <button class="btn btn-primary" :disabled="!selection.size" @click="confirm">בחירה</button>
            <button class="btn btn-secondary" @click="emit('close')">ביטול</button>
          </div>
          <span class="pf-count"
            >נבחרו: <span class="num">{{ selection.size }}</span> סעיפים</span
          >
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 44, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 65;
}
.picker {
  width: 920px;
  max-width: 96vw;
  height: 657px;
  max-height: 92vh;
  background: var(--surface);
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  padding: 8px 0 16px;
}
.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  height: 40px;
  padding: 0 32px;
}
.ph-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
}
.ph-start {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ph-catalog {
  font-size: 12px;
  color: var(--text-secondary);
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  display: inline-flex;
  padding: 2px;
}
.picker-divider {
  height: 1.5px;
  background: var(--divider);
  margin: 8px 0 12px;
}
.picker-filters {
  padding: 0 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.combos {
  display: flex;
  gap: 8px;
  flex-direction: row-reverse;
}
.search-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sr-start {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-direction: row-reverse;
}
.search-btn {
  min-width: 96px;
  padding: 0 24px;
}
.text-disabled {
  color: var(--text-disabled);
}
.pill-wide {
  max-width: 60%;
}
.results-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  padding: 10px 32px 6px;
  font-size: 13px;
  color: var(--text-primary);
}
.rm-actions {
  display: flex;
  gap: 12px;
}
.picker-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 12px;
  padding: 0 32px;
}
.picker-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
}
.empty-sub {
  font-size: 14px;
  color: var(--text-muted);
}
/* tree pane (right) */
.tree-pane {
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
  border-left: 1.5px solid var(--divider);
  padding-left: 8px;
  order: -1; /* rightmost in RTL flex */
}
.tp-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-direction: row-reverse;
  width: 100%;
  background: none;
  border: none;
  font-size: 13px;
  color: var(--text-primary);
  padding: 6px 4px;
  border-radius: 6px;
  text-align: right;
}
.tp-row .ellipsis {
  flex: 1;
  text-align: right;
}
.tp-row.sub {
  padding-right: 22px;
  font-size: 12px;
}
.tp-row:hover {
  background: var(--surface-subtle);
}
.tp-row.active {
  background: var(--brand-primary-soft);
  font-weight: 600;
}
.tp-count {
  color: var(--text-secondary);
  font-size: 11px;
}
/* results */
.results-pane {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}
.results-table {
  width: 100%;
  border-collapse: collapse;
}
.results-table th {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
  padding: 6px 10px;
  border-bottom: 1px solid var(--divider);
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 2;
}
.results-table td {
  font-size: 13px;
  text-align: right;
  padding: 6px 10px;
  border-bottom: 1px solid var(--divider);
}
.r-group td {
  background: var(--surface-subtle);
  font-weight: 700;
  font-size: 12px;
  padding: 5px 10px;
}
.r-group.sub td {
  font-weight: 400;
  padding-right: 22px;
}
.r-row {
  cursor: pointer;
}
.r-row:hover {
  background: var(--surface-subtle);
}
.r-row.checked {
  background: var(--brand-primary-soft);
}
.r-row.disabled {
  cursor: not-allowed;
  color: var(--text-muted);
}
.r-name :deep(.hl) {
  background: var(--highlight);
}
.already {
  color: var(--text-muted);
  font-size: 11px;
  background: var(--surface-muted);
  border-radius: 4px;
  padding: 1px 6px;
  margin-right: 8px;
}
.td-check {
  width: 40px;
}
.radio {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1.5px solid var(--border-strong);
  display: inline-block;
}
.radio.checked {
  border-color: var(--brand-primary);
  box-shadow:
    inset 0 0 0 3.5px var(--surface),
    inset 0 0 0 10px var(--brand-primary);
}
/* footer */
.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  border-top: 1.5px solid var(--divider);
  padding: 14px 32px 0;
}
.pf-start {
  display: flex;
  gap: 12px;
}
.pf-count {
  font-size: 13px;
  color: var(--text-primary);
}
</style>
