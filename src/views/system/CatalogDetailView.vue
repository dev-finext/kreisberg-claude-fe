<script setup>
import { ref, computed, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { PRIORITY } from "@/constants";
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
        (i) => !i.isNote && (!t || i.name.includes(t) || i.code.includes(t) || i.description.includes(t))
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

/* ---------- modals ---------- */
const addMenu = ref(null);
const newMenu = ref(null);
const itemModal = ref(null); // {item, subChapter, initialType}
const chapterModal = ref(null); // {kind, parentChapter, initial}
const notesCtx = ref(null);
const deleteItems = ref(false);
const tagPrompt = ref(false);
const tagName = ref("");

function openAddMenu(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  addMenu.value = { x: rect.left - 120, y: rect.bottom + 4 };
}
function targetSubChapter() {
  const scId = checkedSubIds.value[0];
  return (
    cat.subChapter(scId) ||
    cat.chapter(selectedChapterId.value)?.subChapters[0] ||
    cat.chapters[0].subChapters[0]
  );
}
function onAdd(kind) {
  addMenu.value = null;
  itemModal.value = { item: null, subChapter: targetSubChapter(), initialType: kind };
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
    ui.toast("תת הפרק נוסף");
  }
  db.persist();
  chapterModal.value = null;
}
function openItem(item) {
  itemModal.value = { item, subChapter: cat.subChapter(item.subChapterId), initialType: item.type };
}
function confirmDeleteItems() {
  const ids = [...checkedItemIds.value];
  for (const ch of db.db.catalog.chapters)
    for (const sc of ch.subChapters) sc.items = sc.items.filter((i) => !ids.includes(i.id));
  checkedItemIds.value = [];
  db.persist();
  deleteItems.value = false;
  ui.toast(`${ids.length} סעיפים נמחקו מהקטלוג`);
}
function createTag() {
  const name = tagName.value.trim();
  if (!name) return;
  let tag = db.tags.find((t) => t.name === name);
  if (!tag) {
    tag = { id: db.nextId("tags"), name };
    db.db.tags.push(tag);
  }
  for (const id of checkedItemIds.value) {
    const it = cat.item(id);
    if (it && !it.tags.includes(tag.id)) it.tags.push(tag.id);
  }
  db.persist();
  ui.toast(
    checkedItemIds.value.length
      ? `התגית "${name}" שויכה ל-${checkedItemIds.value.length} סעיפים`
      : `התגית "${name}" נוצרה`
  );
  tagPrompt.value = false;
  tagName.value = "";
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
          <select
            class="select lang"
            :value="catalogMeta?.lang"
            @change="
              catalogMeta.lang = $event.target.value;
              db.persist();
            "
          >
            <option>עברית</option>
            <option>English</option>
          </select>
          <span class="dot" />
          <span class="active-lbl">פעיל</span>
          <BaseToggle :model-value="!!catalogMeta?.active" @update:model-value="setActive" />
        </div>
        <div class="sh-start">
          <button class="tb-btn" @click="openAddMenu">
            <AppIcon name="plus-circle" :size="20" />
            <span>סעיף</span>
          </button>
          <button class="tb-btn" @click="tagPrompt = true">
            <AppIcon name="plus-circle" :size="20" />
            <span>תגית</span>
          </button>
          <button class="tb-btn" :disabled="!checkedItemIds.length" @click="deleteItems = true">
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
            <AppIcon name="plus-circle" :size="20" />
          </button>
          <div class="tree scroll-slim">
            <div class="tree-root"><AppIcon name="chevron-down" :size="16" /><span>הכל</span></div>
            <template v-for="ch in cat.chapters" :key="ch.id">
              <div
                class="tree-row"
                :class="{ selected: ch.id === selectedChapterId }"
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
                <span class="lbl ellipsis">פרק-{{ ch.num }} {{ ch.name }}</span>
              </div>
              <template v-if="expandedChapterIds.includes(ch.id)">
                <div
                  v-for="sc in ch.subChapters"
                  :key="sc.id"
                  class="tree-row sub"
                  :class="{ checked: checkedSubIds.includes(sc.id) }"
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
          <table class="items-table">
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
              </tr>
            </thead>
            <tbody>
              <template v-for="g in groups" :key="g.chapter.id">
                <template v-for="sg in g.subGroups" :key="sg.subChapter.id">
                  <tr class="group-row">
                    <td colspan="9">
                      <div class="group-inner">
                        <div class="g-lines">
                          <div class="g-title">
                            <span>פרק {{ g.chapter.num }} - {{ g.chapter.name }}</span>
                            <button
                              class="note-btn"
                              @click="notesCtx = { scope: 'chapter', target: g.chapter }"
                            >
                              <AppIcon name="note" :size="16" />
                              <span v-if="noteCount('chapter', g.chapter.id)" class="note-count num">{{
                                noteCount("chapter", g.chapter.id)
                              }}</span>
                            </button>
                          </div>
                          <div class="g-sub">
                            <span>תת פרק {{ sg.subChapter.num }} - {{ sg.subChapter.name }}</span>
                            <button
                              class="note-btn"
                              @click="notesCtx = { scope: 'subChapter', target: sg.subChapter }"
                            >
                              <AppIcon name="note" :size="16" />
                              <span v-if="noteCount('subChapter', sg.subChapter.id)" class="note-count num">{{
                                noteCount("subChapter", sg.subChapter.id)
                              }}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <template v-for="item in sg.items" :key="item.id">
                    <tr
                      class="item-row"
                      :class="{ checked: checkedItemIds.includes(item.id) }"
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
                      <td class="td-desc ellipsis">{{ item.description }}</td>
                      <td>{{ item.unit }}</td>
                      <td>{{ resourceTypeName(item) }}</td>
                      <td class="num">{{ parentCode(item) }}</td>
                      <td @click.stop>
                        <PriorityControl
                          :model-value="item.priority || PRIORITY.RECOMMENDED"
                          @update:model-value="(v) => setPriority(item, v)"
                        />
                      </td>
                      <td class="num">{{ item.amortization || 0 }}%</td>
                    </tr>
                    <tr v-if="expandedItemIds.includes(item.id)" class="desc-row">
                      <td colspan="9">
                        <div class="desc-panel">{{ item.description }}</div>
                      </td>
                    </tr>
                  </template>
                  <tr v-if="!sg.items.length">
                    <td colspan="9" class="empty-sub">אין סעיפים בתת פרק זה</td>
                  </tr>
                </template>
              </template>
              <tr v-if="!groups.length">
                <td colspan="9" class="empty-sub">בחר פרק או תת פרק להצגת סעיפים</td>
              </tr>
            </tbody>
          </table>
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
      @saved="itemModal = null"
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
    <DeleteConfirmModal
      v-if="deleteItems"
      title="מחיקת סעיפים"
      :message="`האם למחוק ${checkedItemIds.length} סעיפים מהקטלוג?`"
      @close="deleteItems = false"
      @confirm="confirmDeleteItems"
    />
    <Teleport to="body">
      <div v-if="tagPrompt" class="mini-overlay" @mousedown.self="tagPrompt = false">
        <div class="mini-modal">
          <h3 class="m-title">הוספת תגית</h3>
          <p class="m-msg">
            {{
              checkedItemIds.length
                ? `התגית תשויך ל-${checkedItemIds.length} הסעיפים המסומנים`
                : "לא סומנו סעיפים — התגית תיווצר בלבד"
            }}
          </p>
          <input
            v-model="tagName"
            list="cd-tags"
            class="input"
            placeholder="בחר/הקלד ליצירת תגית חדשה"
            @keyup.enter="createTag"
          />
          <datalist id="cd-tags"><option v-for="t in db.tags" :key="t.id" :value="t.name" /></datalist>
          <div class="m-actions">
            <button class="btn btn-primary" :disabled="!tagName.trim()" @click="createTag">אישור</button>
            <button class="btn btn-secondary" @click="tagPrompt = false">ביטול</button>
          </div>
        </div>
      </div>
    </Teleport>
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
.lang {
  width: 96px;
  height: 32px;
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
.panel {
  width: 291px;
  flex-shrink: 0;
  border-left: 2px solid var(--divider);
  padding: 0 0 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.panel-box {
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
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
  padding: 0 6px;
  font-size: 14px;
}
.tree-row {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  border-radius: 8px;
  padding: 0 4px;
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
  padding-right: 28px;
  font-size: 13px;
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
.items-table th {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
  padding: 8px 10px;
  border-bottom: 1px solid var(--divider);
  background: var(--surface-subtle);
  white-space: nowrap;
  position: sticky;
  top: 0;
}
.items-table td {
  font-size: 13px;
  text-align: right;
  padding: 6px 10px;
  border-bottom: 1px solid var(--divider);
  height: 40px;
}
.group-row td {
  background: var(--surface-subtle);
  padding: 8px 10px;
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
  font-size: 13px;
}
.g-title {
  font-weight: 700;
}
.g-sub {
  padding-right: 8px;
}
.note-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: var(--brand-primary);
  padding: 0;
}
.note-count {
  background: var(--brand-primary);
  color: #fff;
  font-size: 10px;
  border-radius: 999px;
  min-width: 15px;
  height: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
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
  width: 58px;
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
  max-width: 150px;
}
.td-desc {
  max-width: 220px;
  color: var(--text-secondary);
}
.items-table th:nth-child(1) {
  width: 58px;
}
.items-table th:nth-child(2) {
  width: 110px;
}
.items-table th:nth-child(4) {
  width: 24%;
}
.desc-row td {
  background: var(--row-open-bg);
  padding: 8px 24px 12px;
}
.desc-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-line;
}
.empty-sub {
  text-align: center;
  color: var(--text-muted);
  padding: 20px 0;
}
.mini-overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 44, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 75;
}
.mini-modal {
  background: var(--surface);
  border-radius: 6px;
  box-shadow: var(--shadow-modal);
  width: 430px;
  padding: 24px 28px;
  text-align: right;
}
.m-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.m-msg {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
.m-actions {
  display: flex;
  gap: 12px;
  flex-direction: row-reverse;
  justify-content: flex-start;
  margin-top: 16px;
}
</style>
