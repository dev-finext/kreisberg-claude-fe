<script setup>
import { ref, computed, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { PRIORITY, HISTORY_FIELD_LABELS, HISTORY_VALUE_LABELS } from "@/constants";
import { formatDateTime } from "@/utils/format";
import { sanitizeHtml, stripHtml } from "@/utils/html";
import { useFlash } from "@/composables/useFlash";
import PageHeader from "@/components/layout/PageHeader.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import SearchPill from "@/components/shared/SearchPill.vue";
import ContextMenu from "@/components/shared/ContextMenu.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";
import PriorityControl from "@/components/boq/PriorityControl.vue";
import ChapterNotesModal from "@/components/boq/ChapterNotesModal.vue";
import CatalogItemModal from "@/components/catalog/CatalogItemModal.vue";
import ChapterModal from "@/components/catalog/ChapterModal.vue";
import TagCreateModal from "@/components/catalog/TagCreateModal.vue";
import EmptyClipboard from "@/components/shared/EmptyClipboard.vue";

/* 5-second highlight on anything just created, so it stands out among the rest */
const flashChapters = useFlash("chapter");
const flashSubs = useFlash("sub");
const flashItems = useFlash("item");

const route = useRoute();
const router = useRouter();
const db = useDbStore();
const cat = useCatalogStore();
const ui = useUiStore();

const catalogMeta = computed(
  () => db.catalogs.find((c) => c.id === Number(route.params.id)) || db.catalogs[0]
);
const search = ref("");
const renaming = ref(false);
const nameDraft = ref("");
const nameInput = ref(null);

/* ---------- chapters tree (right panel) ---------- */
const expandedChapterIds = ref(cat.chapters.slice(0, 1).map((c) => c.id));
const checkedSubIds = ref(cat.chapters[0]?.subChapters.slice(0, 2).map((s) => s.id) || []);
const selectedChapterId = ref(cat.chapters[0]?.id ?? null);

function chapterChecked(ch) {
  return ch.subChapters.length > 0 && ch.subChapters.every((s) => checkedSubIds.value.includes(s.id));
}
function setChapter(ch, v) {
  const ids = ch.subChapters.map((s) => s.id);
  checkedSubIds.value = v
    ? [...new Set([...checkedSubIds.value, ...ids])]
    : checkedSubIds.value.filter((id) => !ids.includes(id));
  selectedChapterId.value = ch.id;
  if (v && !expandedChapterIds.value.includes(ch.id)) expandedChapterIds.value.push(ch.id);
}
function setSub(sc, v) {
  checkedSubIds.value = v
    ? [...checkedSubIds.value, sc.id]
    : checkedSubIds.value.filter((id) => id !== sc.id);
  selectedChapterId.value = sc.chapterId;
}
function toggleExpand(chId) {
  const i = expandedChapterIds.value.indexOf(chId);
  if (i >= 0) expandedChapterIds.value.splice(i, 1);
  else expandedChapterIds.value.push(chId);
}

/* ---------- table groups ---------- */
const groups = computed(() => {
  const t = search.value.trim();
  const out = [];
  for (const ch of cat.chapters) {
    const subs = ch.subChapters.filter((sc) =>
      checkedSubIds.value.length ? checkedSubIds.value.includes(sc.id) : ch.id === selectedChapterId.value
    );
    const subGroups = [];
    for (const sc of subs) {
      const items = sc.items.filter(
        (i) =>
          !i.isNote &&
          (!t || i.name.includes(t) || i.code.includes(t) || stripHtml(i.description).includes(t))
      );
      if (items.length || !t) subGroups.push({ subChapter: sc, items });
    }
    if (subGroups.length) out.push({ chapter: ch, subGroups });
  }
  return out;
});
const visibleItems = computed(() => groups.value.flatMap((g) => g.subGroups.flatMap((s) => s.items)));
const checkedItemIds = ref([]);
const expandedItemIds = ref([]);
const allChecked = computed(
  () => visibleItems.value.length > 0 && visibleItems.value.every((i) => checkedItemIds.value.includes(i.id))
);
function setAll(v) {
  checkedItemIds.value = v ? visibleItems.value.map((i) => i.id) : [];
}
function toggleItem(id, v) {
  if (v && !checkedItemIds.value.includes(id)) checkedItemIds.value.push(id);
  if (!v) checkedItemIds.value = checkedItemIds.value.filter((x) => x !== id);
}
function toggleExpandItem(id) {
  const i = expandedItemIds.value.indexOf(id);
  if (i >= 0) expandedItemIds.value.splice(i, 1);
  else expandedItemIds.value.push(id);
}
function resourceTypeName(item) {
  return db.resourceTypes.find((t) => t.id === item.resourceTypeId)?.name || "---";
}
function parentCode(item) {
  return item.parentId ? cat.item(item.parentId)?.code || "---" : "---";
}
function setPriority(item, v) {
  item.priority = v;
  db.persist();
}
function noteCount(scope, id) {
  return db.comments.filter((c) => c.scope === scope && c.refId === id).length;
}
/* chapter / sub-chapter headers carry an "הוספת הערה" pill and show the latest note inline */
function noteLabel(scope, id) {
  const n = noteCount(scope, id);
  return n ? `הערות (${n})` : "הוספת הערה";
}
function latestNote(scope, id) {
  const list = db.comments.filter((c) => c.scope === scope && c.refId === id);
  return list.length ? list[list.length - 1] : null;
}

/* ---------- expanded row (Figma "בחירת שורה והצגת תיאור") ---------- */
const ROW_TABS = [
  { id: "desc", label: "תיאור" },
  { id: "notes", label: "הערות" },
  { id: "related", label: "סעיפים קשורים" },
  { id: "alts", label: "סעיפים חלופיים" },
  { id: "history", label: "הסטוריית סעיף" },
];
const rowTabs = ref({});
function rowTab(id) {
  return rowTabs.value[id] || "desc";
}
function setRowTab(id, tab) {
  rowTabs.value = { ...rowTabs.value, [id]: tab };
}
function itemTags(item) {
  return (item.tags || []).map((id) => cat.tagById.get(id)).filter(Boolean);
}
function itemNotes(item) {
  return db.comments.filter((c) => c.scope === "item" && c.refId === item.id);
}
function itemHistory(item) {
  return db.history.filter((h) => h.itemId === item.id).sort((a, b) => b.ts.localeCompare(a.ts));
}
function itemAlts(item) {
  return (item.alternativeIds || []).map((id) => cat.item(id)).filter(Boolean);
}
function fieldLabel(name) {
  return HISTORY_FIELD_LABELS[name] || name;
}
function valueLabel(v) {
  return HISTORY_VALUE_LABELS[v] ?? v;
}

/* the catalog is empty until the first section is added (Figma "קטלוג חדש") */
const totalItems = computed(() =>
  cat.chapters.reduce(
    (n, ch) => n + ch.subChapters.reduce((m, sc) => m + sc.items.filter((i) => !i.isNote).length, 0),
    0
  )
);

/* ---------- modals ---------- */
const addMenu = ref(null);
const newMenu = ref(null);
const itemModal = ref(null); // {item, subChapter, initialType}
const chapterModal = ref(null); // {kind, parentChapter, initial}
const notesCtx = ref(null);
const deleteIds = ref([]); // items pending deletion (toolbar selection or a single row)
const rowMenu = ref(null); // {item, x, y}
const tagModal = ref(false);

function openAddMenu(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  addMenu.value = { x: rect.left - 120, y: rect.bottom + 4 };
}
function targetSubChapter() {
  const scId = checkedSubIds.value[0];
  return (
    cat.subChapter(scId) ||
    cat.chapter(selectedChapterId.value)?.subChapters[0] ||
    cat.chapters[0]?.subChapters[0] ||
    null
  );
}
function onAdd(kind) {
  addMenu.value = null;
  const sc = targetSubChapter();
  if (!sc) {
    ui.toast("יש להוסיף פרק ותת פרק לפני הוספת סעיפים", "warning");
    return;
  }
  itemModal.value = { item: null, subChapter: sc, initialType: kind };
}
function openNewMenu(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  newMenu.value = { x: rect.left - 120, y: rect.bottom + 4 };
}
function onNew(kind) {
  newMenu.value = null;
  if (kind === "subChapter" && !selectedChapterId.value) {
    ui.toast("בחר פרק תחילה", "warning");
    return;
  }
  chapterModal.value = {
    kind,
    parentChapter: kind === "subChapter" ? cat.chapter(selectedChapterId.value) : null,
    initial: null,
  };
}
function saveChapter(data) {
  const m = chapterModal.value;
  const chapters = db.db.catalog.chapters;
  if (m.kind === "chapter") {
    const ch = {
      id: Math.max(0, ...chapters.map((c) => c.id)) + 1,
      code: data.code,
      num: data.code.split(".")[0],
      name: data.name,
      subChapters: [],
    };
    chapters.push(ch);
    selectedChapterId.value = ch.id;
    flashChapters.flash(ch.id);
    ui.toast("הפרק נוסף");
  } else {
    const parent = chapters.find((c) => c.id === m.parentChapter.id);
    const allSubs = chapters.flatMap((c) => c.subChapters);
    const sc = {
      id: Math.max(0, ...allSubs.map((s) => s.id)) + 1,
      chapterId: parent.id,
      code: data.code,
      num: data.code.split(".")[1] || "",
      name: data.name,
      items: [],
    };
    parent.subChapters.push(sc);
    checkedSubIds.value.push(sc.id);
    if (!expandedChapterIds.value.includes(parent.id)) expandedChapterIds.value.push(parent.id);
    flashSubs.flash(sc.id);
    ui.toast("תת הפרק נוסף");
  }
  db.persist();
  chapterModal.value = null;
}
function openItem(item) {
  itemModal.value = { item, subChapter: cat.subChapter(item.subChapterId), initialType: item.type };
}
/* a brand-new section: make sure its branch is on screen, then highlight the row */
function onItemSaved(item) {
  const isNew = !itemModal.value?.item;
  itemModal.value = null;
  if (!isNew || !item) return;
  if (!expandedChapterIds.value.includes(item.chapterId)) expandedChapterIds.value.push(item.chapterId);
  if (checkedSubIds.value.length && !checkedSubIds.value.includes(item.subChapterId))
    checkedSubIds.value.push(item.subChapterId);
  selectedChapterId.value = item.chapterId;
  flashItems.flash(item.id);
}
function confirmDeleteItems() {
  const ids = [...deleteIds.value];
  for (const ch of db.db.catalog.chapters)
    for (const sc of ch.subChapters) sc.items = sc.items.filter((i) => !ids.includes(i.id));
  checkedItemIds.value = checkedItemIds.value.filter((id) => !ids.includes(id));
  db.persist();
  deleteIds.value = [];
  ui.toast(ids.length === 1 ? "הסעיף נמחק מהקטלוג" : `${ids.length} סעיפים נמחקו מהקטלוג`);
}
/* per-row kebab (shows on hover, like the master list) */
function openRowMenu(item, e) {
  const rect = e.currentTarget.getBoundingClientRect();
  rowMenu.value = { item, x: rect.left - 120, y: rect.bottom + 4 };
}
function onRowMenu(key) {
  const item = rowMenu.value.item;
  rowMenu.value = null;
  if (key === "edit") openItem(item);
  else if (key === "delete") deleteIds.value = [item.id];
}
function onTagCreated() {
  tagModal.value = false;
  flashItems.flash([...checkedItemIds.value]);
  checkedItemIds.value = [];
}

/* ---------- rename / active ---------- */
function startRename() {
  nameDraft.value = catalogMeta.value.name;
  renaming.value = true;
  nextTick(() => nameInput.value?.focus());
}
function commitRename() {
  if (nameDraft.value.trim()) catalogMeta.value.name = nameDraft.value.trim();
  catalogMeta.value.updatedAt = new Date().toISOString();
  db.persist();
  renaming.value = false;
}
function setActive(v) {
  catalogMeta.value.active = v;
  db.persist();
}
</script>

<template>
  <div>
    <PageHeader title="קטלוגים" :crumbs="['מערכת', 'קטלוגים']" :crumb-current="catalogMeta?.name">
      <template #actions>
        <button class="btn btn-primary" @click="ui.toast('השינויים נשמרו')">שמירה</button>
        <button class="btn btn-secondary" @click="router.push('/system/catalogs')">ביטול</button>
      </template>
    </PageHeader>

    <div class="card">
      <!-- sub header -->
      <div class="sub-header">
        <div class="sh-end">
          <input
            v-if="renaming"
            ref="nameInput"
            v-model="nameDraft"
            class="rename-input"
            @keyup.enter="commitRename"
            @keyup.esc="renaming = false"
            @blur="commitRename"
          />
          <h3 v-else class="cat-name" @dblclick="startRename">{{ catalogMeta?.name }}</h3>
          <button class="icon-btn" title="שינוי שם" @click="startRename">
            <AppIcon name="pencil" :size="18" />
          </button>
          <span class="dot" />
          <span class="active-lbl">פעיל</span>
          <BaseToggle :model-value="!!catalogMeta?.active" @update:model-value="setActive" />
        </div>
        <div class="sh-start">
          <button class="tb-btn" @click="openAddMenu">
            <AppIcon name="plus-circle" :size="24" />
            <span>סעיף</span>
          </button>
          <button
            class="tb-btn"
            :disabled="!checkedItemIds.length"
            title="ניתן להוסיף תגית חדשה כאשר בוחרים סעיפים"
            @click="tagModal = true"
          >
            <AppIcon name="plus-circle" :size="24" />
            <span>תגית</span>
          </button>
          <button v-if="checkedItemIds.length" class="tb-btn" @click="deleteIds = [...checkedItemIds]">
            <AppIcon name="trash" :size="18" />
            <span>מחק</span>
          </button>
          <span class="v-divider" />
          <SearchPill v-model="search" placeholder="חיפוש לפי פרק/סעיף/תת סעיף" />
        </div>
      </div>

      <div class="body">
        <!-- chapters panel -->
        <aside class="panel">
          <div class="panel-box">פרקים</div>
          <button class="ghost-btn" @click="openNewMenu">
            <span>חדש</span>
            <AppIcon name="plus-circle" :size="24" />
          </button>
          <div class="tree scroll-slim">
            <div class="tree-root"><AppIcon name="chevron-down" :size="16" /><span>הכל</span></div>
            <template v-for="ch in cat.chapters" :key="ch.id">
              <div
                class="tree-row"
                :class="{ selected: ch.id === selectedChapterId, 'flash-ring': flashChapters.isNew(ch.id) }"
                :data-flash="flashChapters.mark(ch.id)"
                @click="selectedChapterId = ch.id"
              >
                <span class="chev" @click.stop="toggleExpand(ch.id)">
                  <AppIcon
                    :name="expandedChapterIds.includes(ch.id) ? 'chevron-down' : 'chevron-left'"
                    :size="16"
                  />
                </span>
                <BaseCheckbox
                  size="small"
                  :model-value="chapterChecked(ch)"
                  @update:model-value="(v) => setChapter(ch, v)"
                />
                <span class="lbl ellipsis">פרק {{ ch.num }}-{{ ch.name }}</span>
              </div>
              <template v-if="expandedChapterIds.includes(ch.id)">
                <div
                  v-for="sc in ch.subChapters"
                  :key="sc.id"
                  class="tree-row sub"
                  :class="{ checked: checkedSubIds.includes(sc.id), 'flash-ring': flashSubs.isNew(sc.id) }"
                  :data-flash="flashSubs.mark(sc.id)"
                >
                  <BaseCheckbox
                    size="small"
                    :model-value="checkedSubIds.includes(sc.id)"
                    @update:model-value="(v) => setSub(sc, v)"
                  />
                  <span class="lbl ellipsis">תת פרק {{ sc.num }} - {{ sc.name }}</span>
                </div>
              </template>
            </template>
          </div>
        </aside>

        <!-- items table -->
        <section class="main scroll-slim">
          <table v-if="totalItems" class="items-table">
            <thead>
              <tr>
                <th class="th-check">
                  <BaseCheckbox :model-value="allChecked" @update:model-value="setAll" />
                </th>
                <th>מספר סעיף</th>
                <th>שם סעיף</th>
                <th>תיאור סעיף</th>
                <th>יח' מידה</th>
                <th>סוג משאב</th>
                <th>סעיף אב</th>
                <th>עדיפות</th>
                <th>פחת</th>
                <th class="th-kebab"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="g in groups" :key="g.chapter.id">
                <template v-for="sg in g.subGroups" :key="sg.subChapter.id">
                  <tr class="group-row">
                    <td colspan="10">
                      <div class="g-lines">
                        <div class="g-title">
                          <span>פרק {{ g.chapter.num }}-{{ g.chapter.name }}</span>
                          <button
                            class="note-pill"
                            @click="notesCtx = { scope: 'chapter', target: g.chapter }"
                          >
                            {{ noteLabel("chapter", g.chapter.id) }}
                          </button>
                        </div>
                        <!-- latest note, inline under the chapter title (Figma "Note") -->
                        <p
                          v-if="latestNote('chapter', g.chapter.id)"
                          class="g-note"
                          @click="notesCtx = { scope: 'chapter', target: g.chapter }"
                        >
                          <span class="g-note-lbl">הערה:</span>
                          {{ stripHtml(latestNote("chapter", g.chapter.id).text) }}
                        </p>
                        <div class="g-sub">
                          <span>תת פרק {{ sg.subChapter.num }}-{{ sg.subChapter.name }}</span>
                          <button
                            class="note-pill"
                            @click="notesCtx = { scope: 'subChapter', target: sg.subChapter }"
                          >
                            {{ noteLabel("subChapter", sg.subChapter.id) }}
                          </button>
                        </div>
                        <p
                          v-if="latestNote('subChapter', sg.subChapter.id)"
                          class="g-note"
                          @click="notesCtx = { scope: 'subChapter', target: sg.subChapter }"
                        >
                          <span class="g-note-lbl">הערה:</span>
                          {{ stripHtml(latestNote("subChapter", sg.subChapter.id).text) }}
                        </p>
                      </div>
                    </td>
                  </tr>
                  <template v-for="item in sg.items" :key="item.id">
                    <tr
                      class="item-row"
                      :class="{
                        checked: checkedItemIds.includes(item.id),
                        'flash-new': flashItems.isNew(item.id),
                      }"
                      :data-flash="flashItems.mark(item.id)"
                      @click="openItem(item)"
                    >
                      <td class="td-check" @click.stop>
                        <span class="expand" @click="toggleExpandItem(item.id)">
                          <AppIcon
                            :name="expandedItemIds.includes(item.id) ? 'chevron-down' : 'chevron-left'"
                            :size="16"
                          />
                        </span>
                        <BaseCheckbox
                          :model-value="checkedItemIds.includes(item.id)"
                          @update:model-value="(v) => toggleItem(item.id, v)"
                        />
                      </td>
                      <td>
                        <span class="item-code">{{ item.code }}</span>
                      </td>
                      <td class="td-name ellipsis">{{ item.name }}</td>
                      <td class="td-desc ellipsis">{{ stripHtml(item.description) }}</td>
                      <td>{{ item.unit }}</td>
                      <td>{{ resourceTypeName(item) }}</td>
                      <td class="num">{{ parentCode(item) }}</td>
                      <td @click.stop>
                        <PriorityControl
                          :model-value="item.priority || PRIORITY.RECOMMENDED"
                          @update:model-value="(v) => setPriority(item, v)"
                        />
                      </td>
                      <td class="td-amort num">{{ item.amortization || 0 }}%</td>
                      <td class="td-kebab" @click.stop>
                        <button class="row-kebab" title="פעולות" @click="openRowMenu(item, $event)">
                          <AppIcon name="kebab" :size="16" />
                        </button>
                      </td>
                    </tr>
                    <tr v-if="expandedItemIds.includes(item.id)" class="desc-row">
                      <td colspan="10">
                        <div class="dp">
                          <div class="dp-head">
                            <div class="dp-tabs">
                              <button
                                v-for="t in ROW_TABS"
                                :key="t.id"
                                class="dp-tab"
                                :class="{ active: rowTab(item.id) === t.id }"
                                @click="setRowTab(item.id, t.id)"
                              >
                                {{ t.label }}
                              </button>
                            </div>
                            <button class="icon-btn" title="עריכת סעיף" @click="openItem(item)">
                              <AppIcon name="pencil" :size="24" />
                            </button>
                          </div>

                          <template v-if="rowTab(item.id) === 'desc'">
                            <div v-if="itemTags(item).length" class="chips">
                              <span v-for="t in itemTags(item)" :key="t.id" class="chip">{{ t.name }}</span>
                            </div>
                            <p class="dp-text" v-html="sanitizeHtml(item.description)"></p>
                          </template>

                          <template v-else-if="rowTab(item.id) === 'notes'">
                            <p v-for="n in itemNotes(item)" :key="n.id" class="dp-text">
                              <span class="g-note-lbl">{{ n.author }} · {{ formatDateTime(n.ts) }}</span>
                              <br /><span v-html="sanitizeHtml(n.text)"></span>
                            </p>
                            <p v-if="!itemNotes(item).length" class="dp-empty">אין הערות לסעיף זה</p>
                          </template>

                          <template v-else-if="rowTab(item.id) === 'related'">
                            <p v-if="item.parentId" class="dp-text">
                              <span class="g-note-lbl">סעיף אב:</span>
                              {{ parentCode(item) }} · {{ cat.item(item.parentId)?.name }}
                            </p>
                            <p v-for="c in cat.childrenOf(item.id)" :key="c.id" class="dp-text">
                              <span class="g-note-lbl">סעיף בן:</span> {{ c.code }} · {{ c.name }}
                            </p>
                            <p v-if="!item.parentId && !cat.childrenOf(item.id).length" class="dp-empty">
                              אין סעיפים קשורים
                            </p>
                          </template>

                          <template v-else-if="rowTab(item.id) === 'alts'">
                            <p v-for="a in itemAlts(item)" :key="a.id" class="dp-text">
                              {{ a.code }} · {{ a.name }}
                            </p>
                            <p v-if="!itemAlts(item).length" class="dp-empty">לא הוגדרו סעיפים חלופיים</p>
                          </template>

                          <template v-else>
                            <p v-for="h in itemHistory(item)" :key="h.id" class="dp-text">
                              <span class="g-note-lbl">{{ h.user }} · {{ formatDateTime(h.ts) }}</span>
                              <br />
                              <span v-for="(c, ci) in h.changes" :key="ci">
                                {{ fieldLabel(c.field) }}: {{ valueLabel(c.from) }} ← {{ valueLabel(c.to) }}
                              </span>
                            </p>
                            <p v-if="!itemHistory(item).length" class="dp-empty">אין היסטוריה לסעיף זה</p>
                          </template>
                        </div>
                      </td>
                    </tr>
                  </template>
                  <tr v-if="!sg.items.length">
                    <td colspan="10" class="empty-sub">אין סעיפים בתת פרק זה</td>
                  </tr>
                </template>
              </template>
              <tr v-if="!groups.length">
                <td colspan="10" class="empty-sub">בחר פרק או תת פרק להצגת סעיפים</td>
              </tr>
            </tbody>
          </table>

          <!-- Figma "קטלוג חדש": nothing added yet -->
          <div v-else class="empty">
            <EmptyClipboard />
            <p class="empty-title">עדיין לא נוספו סעיפים</p>
            <p class="empty-sub">אפשר להוסיף סעיפים לקטלוג</p>
            <button class="btn btn-primary empty-cta" @click="onAdd('regular')">הוספת סעיפים</button>
          </div>
        </section>
      </div>
    </div>

    <ContextMenu
      v-if="addMenu"
      :items="[
        { key: 'regular', label: 'סעיף רגיל', icon: 'plus-circle' },
        { key: 'composite', label: 'סעיף מורכב', icon: 'copy' },
      ]"
      :x="addMenu.x"
      :y="addMenu.y"
      @select="onAdd"
      @close="addMenu = null"
    />
    <ContextMenu
      v-if="newMenu"
      :items="[
        { key: 'chapter', label: 'פרק חדש', icon: 'plus-circle' },
        { key: 'subChapter', label: 'תת פרק חדש', icon: 'plus-circle' },
      ]"
      :x="newMenu.x"
      :y="newMenu.y"
      @select="onNew"
      @close="newMenu = null"
    />
    <CatalogItemModal
      v-if="itemModal"
      :item="itemModal.item"
      :sub-chapter="itemModal.subChapter"
      :initial-type="itemModal.initialType"
      :catalog-name="catalogMeta?.name"
      @close="itemModal = null"
      @saved="onItemSaved"
      @deleted="itemModal = null"
    />
    <ChapterModal
      v-if="chapterModal"
      :kind="chapterModal.kind"
      :parent-chapter="chapterModal.parentChapter"
      :initial="chapterModal.initial"
      @close="chapterModal = null"
      @save="saveChapter"
    />
    <ChapterNotesModal
      v-if="notesCtx"
      :scope="notesCtx.scope"
      :target="notesCtx.target"
      @close="notesCtx = null"
    />
    <ContextMenu
      v-if="rowMenu"
      :items="[
        { key: 'edit', label: 'עריכה', icon: 'pencil' },
        { key: 'delete', label: 'מחיקה', icon: 'trash', danger: true },
      ]"
      :x="rowMenu.x"
      :y="rowMenu.y"
      @select="onRowMenu"
      @close="rowMenu = null"
    />
    <DeleteConfirmModal
      v-if="deleteIds.length"
      :title="deleteIds.length === 1 ? 'מחיקת סעיף' : 'מחיקת סעיפים'"
      :message="
        deleteIds.length === 1
          ? 'האם למחוק את הסעיף מהקטלוג?'
          : `האם למחוק ${deleteIds.length} סעיפים מהקטלוג?`
      "
      @close="deleteIds = []"
      @confirm="confirmDeleteItems"
    />
    <TagCreateModal
      v-if="tagModal"
      :preselected="checkedItemIds"
      @close="tagModal = false"
      @created="onTagCreated"
    />
  </div>
</template>

<style scoped>
.card {
  background: var(--surface);
  border-radius: var(--radius-card);
  min-height: calc(100vh - 128px);
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
}
.sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.sh-end {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cat-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.rename-input {
  border: 1px solid #6952ef;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  outline: none;
  width: 180px;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
  padding: 2px;
}
.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-disabled);
}
.active-lbl {
  font-size: 13px;
  color: var(--text-secondary);
}
.sh-start {
  display: flex;
  align-items: center;
  gap: 14px;
}
.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-direction: row-reverse;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
  height: 40px;
}
.tb-btn:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}
.v-divider {
  width: 1px;
  height: 22px;
  background: var(--border-strong);
}
.body {
  display: flex;
  flex: 1;
  min-height: 0;
  border-top: 2px solid var(--divider);
  padding-top: 12px;
}
/* Figma "cataloge.menu": 291 wide, 2px light divider on the left, 16px side padding */
.panel {
  width: 291px;
  flex-shrink: 0;
  border-left: 2px solid var(--surface-muted);
  padding: 0 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* the single "פרקים" tab in the BoQ side-menu tabs shell */
.panel-box {
  border: 1px solid var(--page-bg);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #315583;
}
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-direction: row-reverse;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
  align-self: flex-end;
  height: 32px;
}
.tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.tree-root {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 4px 0 28px;
  font-size: 14px;
}
.tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  border-radius: 8px;
  padding: 0 0 0 28px;
  cursor: pointer;
  font-size: 14px;
}
.tree-row:hover {
  background: var(--surface-subtle);
}
.tree-row.selected,
.tree-row.checked {
  background: var(--brand-primary-soft);
}
.tree-row.sub {
  padding-right: 32px;
}
.chev {
  display: inline-flex;
}
.lbl {
  max-width: 190px;
}
.main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding-left: 8px;
}
.items-table {
  width: 100%;
  border-collapse: collapse;
}
/* Figma "Catalog table": 32px header on the page-bg band, 48px rows with #eeeefc hairlines */
.items-table th {
  height: 32px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
  padding: 0 12px;
  border-bottom: 1px solid #eaeffb;
  background: var(--page-bg);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.items-table td {
  height: 48px;
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
  padding: 0 12px;
  border-bottom: 1px solid #eeeefc;
}
.items-table tr > td:first-child {
  border-right: 1px solid #eeeefc;
}
.items-table tr > td:last-child {
  border-left: 1px solid #eeeefc;
}
/* Figma "headers": chapter + sub-chapter lines on #fcfcfc */
.group-row td {
  height: 60px;
  background: #fcfcfc;
  padding: 8px 36px;
}
.group-row .g-note {
  padding: 4px 0;
}
.g-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.g-title,
.g-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.g-title {
  font-weight: 600;
}
/* "הוספת הערה" pill next to a chapter / sub-chapter title */
.note-pill {
  height: 24px;
  padding: 0 8px;
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  white-space: nowrap;
}
.note-pill:hover {
  background: var(--surface-muted);
}
/* the latest note, shown inline under the title */
.g-note {
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-primary);
  max-width: 584px;
  margin-right: auto;
  cursor: pointer;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.g-note-lbl {
  font-weight: 600;
}
.item-row {
  cursor: pointer;
}
.item-row:hover {
  background: var(--surface-subtle);
}
.item-row.checked {
  background: var(--brand-primary-soft);
}
.td-check {
  white-space: nowrap;
  width: 64px;
}
.expand {
  display: inline-flex;
  vertical-align: middle;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
}
.items-table {
  table-layout: fixed;
}
.td-name {
  max-width: 135px;
}
.td-desc {
  color: var(--text-primary);
  letter-spacing: 0.07px;
}
.td-amort {
  font-size: 12px;
  text-align: center;
}
/* design column widths; the description takes the remainder */
.items-table th:nth-child(1) {
  width: 64px;
}
.items-table th:nth-child(2) {
  width: 124px;
}
.items-table th:nth-child(3) {
  width: 135px;
}
.items-table th:nth-child(5) {
  width: 80px;
}
.items-table th:nth-child(6) {
  width: 124px;
}
.items-table th:nth-child(7) {
  width: 70px;
}
.items-table th:nth-child(8) {
  width: 120px;
}
.items-table th:nth-child(9) {
  width: 67px;
}
.th-kebab,
.td-kebab {
  width: 48px;
  padding: 0 12px;
}
.row-kebab {
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
  padding: 2px;
  opacity: 0;
}
.item-row:hover .row-kebab {
  opacity: 1;
}
/* expanded row: tabs on the right, edit on the left, then chips + text */
.desc-row td {
  background: var(--brand-primary-soft);
  padding: 0;
}
.dp {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 24px;
}
.dp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dp-tabs {
  display: flex;
}
.dp-tab {
  background: none;
  border: none;
  border-bottom: 2px solid var(--surface-muted);
  padding: 8px 24px;
  font-size: 14px;
  line-height: 18px;
  color: var(--text-secondary);
  font-family: inherit;
  white-space: nowrap;
}
.dp-tab.active {
  color: var(--brand-primary);
  border-bottom-color: var(--brand-primary);
  font-weight: 500;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
/* Figma "Tag catalog" */
.chip {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  border: 1px solid var(--text-secondary);
  border-radius: 20px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 14px;
  white-space: nowrap;
}
.dp-text {
  font-size: 14px;
  line-height: 20px;
  color: var(--text-primary);
  white-space: pre-line;
}
.dp-empty {
  font-size: 14px;
  color: var(--text-muted);
}
.empty-sub {
  text-align: center;
  color: var(--text-muted);
  padding: 20px 0;
}
/* empty catalog */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 72px 0 40px;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
}
.empty-sub {
  font-size: 14px;
  color: var(--text-muted);
}
.empty-cta {
  margin-top: 24px;
  min-width: 199px;
}
</style>
