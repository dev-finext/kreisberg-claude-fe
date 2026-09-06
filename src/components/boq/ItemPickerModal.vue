<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";
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
const term = ref(""); // what's typed in the search pill
const applied = ref(null); // last submitted search {chapterId, subChapterId, tagId, term}; null = nothing searched yet
const selection = ref(new Set());
const activeGroupId = ref(null);
const resultsPane = ref(null);
const chapterCombo = ref(null);

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

/* opens focused on the chapter combo, so typing starts narrowing right away */
onMounted(() => nextTick(() => chapterCombo.value?.focus()));

/* every search runs only on "חיפוש" (Enter in the search field = the button); results show the last submitted snapshot */
const canSearch = computed(
  () => !!(chapterId.value || subChapterId.value || tagId.value || term.value.trim())
);
const hasQuery = computed(() => applied.value !== null);
const results = computed(() => (applied.value ? cat.pickerSearch(applied.value) : { items: [], groups: [] }));
const visibleGroups = computed(() => results.value.groups);
const visibleItems = computed(() => visibleGroups.value.flatMap((g) => g.subGroups.flatMap((s) => s.items)));

function runSearch() {
  if (!canSearch.value) return;
  applied.value = {
    chapterId: chapterId.value,
    subChapterId: subChapterId.value,
    tagId: tagId.value,
    term: term.value.trim(),
  };
}
function clearAll() {
  chapterId.value = null;
  subChapterId.value = null;
  tagId.value = null;
  term.value = "";
  applied.value = null;
  chapterCombo.value?.focus();
}

function highlight(name) {
  const t = applied.value?.term || "";
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
/* header checkbox = select / clear every selectable visible row */
const selectableVisible = computed(() => visibleItems.value.filter((i) => !isDisabled(i)));
const allVisibleChecked = computed(
  () => selectableVisible.value.length > 0 && selectableVisible.value.every((i) => selection.value.has(i.id))
);
function toggleAll(v) {
  const next = new Set(selection.value);
  for (const i of selectableVisible.value) {
    if (v) next.add(i.id);
    else next.delete(i.id);
  }
  selection.value = next;
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
            <button class="icon-btn" title="סגירה" @click="emit('close')">
              <AppIcon name="cancel" :size="24" />
            </button>
            <span class="ph-catalog">{{ catalogName }}</span>
          </div>
          <h2 class="ph-title">בחירת סעיפים</h2>
        </div>
        <div class="picker-divider" />

        <!-- filters. DOM order = Tab order = RTL visual order: פרק → תת-פרק → תגית → חיפוש -->
        <div class="picker-filters">
          <div class="combos">
            <PickerCombo
              ref="chapterCombo"
              v-model="chapterId"
              :options="chapterOptions"
              placeholder="הקלד או בחר פרק"
            />
            <PickerCombo
              v-model="subChapterId"
              :options="subChapterOptions"
              :placeholder="chapterId ? 'כל תתי הפרקים' : 'בחר פרק תחילה'"
              :disabled="!chapterId"
            />
            <PickerCombo v-model="tagId" :options="tagOptions" placeholder="הקלד או בחר תגית" />
          </div>
          <div class="search-row">
            <SearchPill v-model="term" placeholder="חיפוש סעיפים" width="568px" @submit="runSearch" />
            <div class="sr-actions">
              <button class="btn btn-primary search-btn" :disabled="!canSearch" @click="runSearch">
                חיפוש
              </button>
              <button
                class="btn-text clear-btn"
                :class="{ 'text-disabled': !canSearch && !applied }"
                @click="clearAll"
              >
                ניקוי
              </button>
            </div>
          </div>
        </div>

        <!-- results count -->
        <div v-if="hasQuery" class="results-meta">
          נמצאו <span class="num">{{ visibleItems.length }}</span> סעיפים
        </div>

        <!-- body -->
        <div class="picker-body">
          <div v-if="!hasQuery" class="picker-empty">
            <EmptyClipboard />
            <p class="empty-title">עדיין אין כאן סעיפים</p>
            <p class="empty-sub">הם יופיעו כאן לאחר החיפוש</p>
          </div>
          <div v-else-if="!visibleItems.length" class="picker-empty">
            <EmptyClipboard />
            <p class="empty-title">לא נמצאו סעיפים התואמים לחיפוש</p>
          </div>
          <template v-else>
            <!-- chapter tree with counts (first in DOM = rightmost in RTL) -->
            <div class="tree-pane scroll-slim">
              <template v-for="g in visibleGroups" :key="g.chapter.id">
                <button
                  class="tp-row chapter"
                  :class="{ active: activeGroupId === 'c' + g.chapter.id }"
                  @click="scrollToGroup('c' + g.chapter.id)"
                >
                  <AppIcon name="chevron-down" :size="16" />
                  <span class="tp-label ellipsis">{{ g.chapter.num }}: {{ g.chapter.name }}</span>
                  <span class="tp-count num"
                    >({{ g.subGroups.reduce((n, s) => n + s.items.length, 0) }})</span
                  >
                </button>
                <button
                  v-for="sg in g.subGroups"
                  :key="sg.subChapter.id"
                  class="tp-row sub"
                  :class="{ active: activeGroupId === 's' + sg.subChapter.id }"
                  @click="scrollToGroup('s' + sg.subChapter.id)"
                >
                  <AppIcon name="chevron-left" :size="16" />
                  <span class="tp-label ellipsis">{{ sg.subChapter.num }} - {{ sg.subChapter.name }}</span>
                  <span class="tp-count num">({{ sg.items.length }})</span>
                </button>
              </template>
            </div>

            <!-- results table -->
            <div ref="resultsPane" class="results-pane scroll-slim">
              <table class="results-table">
                <thead>
                  <tr>
                    <th class="th-check">
                      <BaseCheckbox
                        v-if="mode === 'multi'"
                        size="small"
                        :model-value="allVisibleChecked"
                        @update:model-value="toggleAll"
                      />
                    </th>
                    <th class="th-code">מספר סעיף</th>
                    <th class="th-name">שם סעיף</th>
                    <th class="th-unit">יח' מידה</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="g in visibleGroups" :key="g.chapter.id">
                    <tr class="r-group" :data-group="'c' + g.chapter.id">
                      <td colspan="4">
                        <span class="rg-inner">
                          <span>פרק {{ g.chapter.num }} - {{ g.chapter.name }}</span>
                          <AppIcon name="note" :size="16" />
                        </span>
                      </td>
                    </tr>
                    <!-- grouped by chapter only (per design); a sub-chapter's first row is the tree's scroll target -->
                    <template v-for="sg in g.subGroups" :key="sg.subChapter.id">
                      <tr
                        v-for="(item, i) in sg.items"
                        :key="item.key"
                        class="r-row"
                        :class="{ disabled: isDisabled(item), checked: isChecked(item) && !isDisabled(item) }"
                        :data-group="i === 0 ? 's' + sg.subChapter.id : null"
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
                            size="small"
                            :model-value="isChecked(item)"
                            :disabled="isDisabled(item)"
                            @update:model-value="() => toggleItem(item)"
                          />
                        </td>
                        <td class="td-code">
                          <span class="item-code num">{{ item.code }}</span>
                        </td>
                        <td class="td-name">
                          <span class="r-name-text ellipsis" v-html="highlight(item.name)" />
                          <span v-if="isDisabled(item)" class="already">כבר נבחר</span>
                        </td>
                        <td class="td-unit">{{ item.unit }}</td>
                      </tr>
                    </template>
                  </template>
                </tbody>
              </table>
            </div>
          </template>
        </div>

        <!-- footer (only once there's a search, per the design's empty state) -->
        <div v-if="hasQuery" class="picker-footer">
          <div class="pf-start">
            <button class="btn btn-primary" :disabled="!selection.size" @click="confirm">בחירה</button>
            <button class="btn btn-secondary" @click="emit('close')">ביטול</button>
          </div>
          <span class="pf-count">
            נבחרו: <span class="num">{{ selection.size }}</span> סעיפים
          </span>
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
  border-radius: 6px;
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  padding: 8px 0 24px;
}
/* header: title right, X + catalog left (RTL + row-reverse puts the first child leftmost) */
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
  line-height: 24px;
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
  padding: 0;
}
.picker-divider {
  height: 1px;
  background: var(--divider);
  margin: 8px 0;
}
/* filters */
.picker-filters {
  padding: 0 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.combos {
  display: flex;
  gap: 8px; /* DOM order chapter → sub → tag; RTL renders chapter rightmost */
}
.search-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px; /* pill first in DOM = right; actions left */
}
.sr-actions {
  display: flex;
  align-items: center;
  gap: 40px;
}
.search-btn {
  min-width: 96px;
  height: 40px;
  padding: 0 24px;
}
.search-btn:disabled {
  background: var(--border-strong);
  border-color: transparent;
  color: #f4f4f4;
  box-shadow: none;
}
.clear-btn {
  font-size: 14px;
}
.text-disabled {
  color: var(--text-disabled);
}
.results-meta {
  padding: 12px 32px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
}
/* body */
.picker-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 20px;
  padding: 12px 32px 0;
}
.picker-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
  width: 275px;
  flex-shrink: 0;
  overflow-y: auto;
  border-left: 2px solid var(--surface-muted);
  padding: 4px 0 0 16px;
}
.tp-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 32px;
  background: none;
  border: none;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
}
.tp-row.chapter {
  background: var(--brand-primary-soft);
}
.tp-row.sub {
  height: 26px;
  padding-right: 20px;
}
.tp-label {
  flex: 1;
  text-align: right;
}
.tp-count {
  color: var(--text-primary);
}
.tp-row:hover {
  background: var(--surface-subtle);
}
.tp-row.active {
  font-weight: 600;
}
/* results table */
.results-pane {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  border-radius: 8px 8px 0 0;
}
.results-table {
  width: 100%;
  border-collapse: collapse;
}
.results-table th {
  height: 32px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
  padding: 0 12px;
  background: var(--page-bg);
  border-bottom: 1px solid #eaeffb;
  position: sticky;
  top: 0;
  z-index: 2;
  white-space: nowrap;
}
.results-table td {
  height: 48px;
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
  padding: 0 12px;
  border-bottom: 1px solid #eeeefc;
}
.results-table tr > td:first-child {
  border-right: 1px solid #eeeefc;
}
.results-table tr > td:last-child {
  border-left: 1px solid #eeeefc;
}
.th-check,
.td-check {
  width: 40px;
  padding: 0 4px 0 12px;
}
.th-code,
.td-code {
  width: 100px;
  white-space: nowrap;
}
.th-unit,
.td-unit {
  width: 61px;
  text-align: center;
}
.td-name {
  max-width: 310px;
}
.r-name-text {
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
}
.r-name-text :deep(.hl) {
  background: var(--highlight);
}
.r-group td {
  background: #fcfcfc;
  height: 34px;
  font-size: 12px;
  font-weight: 600;
  padding: 0 64px 0 60px;
}
.rg-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.r-row {
  cursor: pointer;
  background: var(--surface);
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
.already {
  color: var(--text-muted);
  font-size: 11px;
  background: var(--surface-muted);
  border-radius: 4px;
  padding: 1px 6px;
  margin-right: 8px;
  vertical-align: middle;
}
.radio {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1.5px solid var(--border-strong);
  display: inline-block;
  vertical-align: middle;
}
.radio.checked {
  border-color: var(--brand-primary);
  box-shadow:
    inset 0 0 0 3.5px var(--surface),
    inset 0 0 0 10px var(--brand-primary);
}
/* footer: buttons left, count right */
.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  padding: 0 32px;
  margin-top: 24px;
}
.pf-start {
  display: flex;
  gap: 12px;
}
.pf-start .btn {
  min-width: 123px;
  height: 40px;
}
.pf-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
