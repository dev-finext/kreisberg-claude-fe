<script setup>
import { ref, computed, nextTick } from "vue";
import { useDbStore } from "@/stores/db";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import PageHeader from "@/components/layout/PageHeader.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import SearchPill from "@/components/shared/SearchPill.vue";
import ContextMenu from "@/components/shared/ContextMenu.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";

const db = useDbStore();
const cat = useCatalogStore();
const ui = useUiStore();

const catalog = computed(() => db.catalogs.find((c) => c.id === 2) || db.catalogs[0]);
const active = ref(true);
const search = ref("");

/* ---------- tags panel ---------- */
const selectedTagId = ref(db.tags[0]?.id ?? null);
const selectedTag = computed(() => db.tags.find((t) => t.id === selectedTagId.value) || null);
const editingTagId = ref(null); // id, or "new"
const tagDraft = ref("");
const tagInput = ref(null);
const tagMenu = ref(null);
const deleteTag = ref(null);

function startNewTag() {
  editingTagId.value = "new";
  tagDraft.value = "";
  nextTick(() => tagInput.value?.[0]?.focus());
}
function startRename(tag) {
  editingTagId.value = tag.id;
  tagDraft.value = tag.name;
  nextTick(() => tagInput.value?.[0]?.focus());
}
function commitTag() {
  const name = tagDraft.value.trim();
  if (editingTagId.value === "new") {
    if (name) {
      const t = { id: db.nextId("tags"), name };
      db.db.tags.push(t);
      selectedTagId.value = t.id;
      db.persist();
      ui.toast(`התגית "${name}" נוצרה`);
    }
  } else if (editingTagId.value) {
    const t = db.db.tags.find((x) => x.id === editingTagId.value);
    if (t && name && name !== t.name) {
      t.name = name;
      db.persist();
      ui.toast("שם התגית עודכן");
    }
  }
  editingTagId.value = null;
}
function openTagMenu(tag, e) {
  const rect = e.currentTarget.getBoundingClientRect();
  tagMenu.value = { tag, x: rect.left - 150, y: rect.bottom + 4 };
}
function onTagMenu(key) {
  const t = tagMenu.value.tag;
  tagMenu.value = null;
  if (key === "rename") startRename(t);
  if (key === "delete") deleteTag.value = t;
}
function confirmDeleteTag() {
  const t = deleteTag.value;
  for (const it of db.allItems) it.tags = it.tags.filter((id) => id !== t.id);
  db.db.tags = db.db.tags.filter((x) => x.id !== t.id);
  if (selectedTagId.value === t.id) selectedTagId.value = db.tags[0]?.id ?? null;
  db.persist();
  deleteTag.value = null;
  ui.toast(`התגית "${t.name}" נמחקה`);
}

/* ---------- items grouped by chapter/sub-chapter ---------- */
const groups = computed(() => {
  const tagId = selectedTagId.value;
  const t = search.value.trim();
  const out = [];
  for (const ch of cat.chapters) {
    const subGroups = [];
    for (const sc of ch.subChapters) {
      const items = sc.items.filter(
        (i) =>
          !i.isNote &&
          ((tagId && i.tags.includes(tagId)) || (t && (i.name.includes(t) || i.code.includes(t))))
      );
      if (items.length) subGroups.push({ subChapter: sc, items });
    }
    if (subGroups.length) out.push({ chapter: ch, subGroups });
  }
  return out;
});
const visibleItems = computed(() => groups.value.flatMap((g) => g.subGroups.flatMap((s) => s.items)));
const allTagged = computed(
  () => visibleItems.value.length > 0 && visibleItems.value.every((i) => i.tags.includes(selectedTagId.value))
);
function hasTag(item) {
  return item.tags.includes(selectedTagId.value);
}
function setTag(item, v) {
  if (!selectedTagId.value) return;
  if (v && !hasTag(item)) item.tags.push(selectedTagId.value);
  if (!v) item.tags = item.tags.filter((id) => id !== selectedTagId.value);
  db.persist();
}
function setAllTag(v) {
  for (const i of visibleItems.value) setTag(i, v);
}
function removeCheckedFromTag() {
  const tagged = visibleItems.value.filter(hasTag);
  for (const i of tagged) setTag(i, false);
  ui.toast(`${tagged.length} סעיפים הוסרו מהתגית`);
}
function saveAll() {
  db.persist();
  ui.toast("השינויים נשמרו");
}
</script>

<template>
  <div>
    <PageHeader title="ניהול תגיות" :crumbs="['מערכת']">
      <template #actions>
        <button class="btn btn-primary" @click="saveAll">שמירה</button>
        <button class="btn btn-secondary" @click="$router.back()">ביטול</button>
      </template>
    </PageHeader>

    <div class="card">
      <!-- sub header -->
      <div class="sub-header">
        <div class="sh-end">
          <h3 class="cat-name">{{ catalog?.name }}</h3>
          <button class="icon-btn" title="שינוי שם קטלוג"><AppIcon name="pencil" :size="18" /></button>
          <span class="dot" />
          <span class="active-lbl">פעיל</span>
          <BaseToggle v-model="active" />
        </div>
        <div class="sh-start">
          <button
            class="tb-btn"
            title="הוספת סעיפים מתבצעת ממסך הקטלוג"
            @click="$router.push('/system/catalogs/2')"
          >
            <AppIcon name="plus-circle" :size="20" />
            <span>סעיף</span>
          </button>
          <button class="tb-btn" @click="startNewTag">
            <AppIcon name="plus-circle" :size="20" />
            <span>תגית</span>
          </button>
          <button
            class="tb-btn"
            :disabled="!selectedTag || !visibleItems.some(hasTag)"
            @click="removeCheckedFromTag"
          >
            <AppIcon name="trash" :size="18" />
            <span>מחק</span>
          </button>
          <span class="v-divider" />
          <SearchPill v-model="search" placeholder="חיפוש לפי פרק/סעיף/תת סעיף" />
        </div>
      </div>

      <div class="body">
        <!-- tags panel -->
        <aside class="tags-panel">
          <div class="panel-box">תגיות</div>
          <button class="ghost-btn" @click="startNewTag">
            <span>חדש</span>
            <AppIcon name="plus-circle" :size="20" />
          </button>
          <div class="tag-list scroll-slim">
            <div v-if="editingTagId === 'new'" class="tag-row editing">
              <input
                ref="tagInput"
                v-model="tagDraft"
                class="tag-input"
                placeholder="שם תגית"
                @keyup.enter="commitTag"
                @keyup.esc="editingTagId = null"
                @blur="commitTag"
              />
            </div>
            <div
              v-for="t in db.tags"
              :key="t.id"
              class="tag-row"
              :class="{ active: t.id === selectedTagId, editing: editingTagId === t.id }"
              @click="selectedTagId = t.id"
              @dblclick="startRename(t)"
            >
              <input
                v-if="editingTagId === t.id"
                ref="tagInput"
                v-model="tagDraft"
                class="tag-input"
                @keyup.enter="commitTag"
                @keyup.esc="editingTagId = null"
                @blur="commitTag"
                @click.stop
              />
              <span v-else class="tag-name ellipsis">{{ t.name }}</span>
              <button class="tag-kebab" @click.stop="openTagMenu(t, $event)">
                <AppIcon name="kebab" :size="16" />
              </button>
            </div>
          </div>
        </aside>

        <!-- items -->
        <section class="main">
          <h3 class="tag-title">{{ selectedTag?.name || "בחר תגית" }}</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th class="th-check">
                  <BaseCheckbox :model-value="allTagged" @update:model-value="setAllTag" />
                </th>
                <th>מס' סעיף</th>
                <th>שם סעיף</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="g in groups" :key="g.chapter.id">
                <tr class="group-row">
                  <td colspan="3">
                    <div class="group-inner">
                      <span class="g-title">פרק {{ g.chapter.num }} - {{ g.chapter.name }}</span>
                      <AppIcon name="note" :size="16" class="note-ico" />
                    </div>
                  </td>
                </tr>
                <template v-for="sg in g.subGroups" :key="sg.subChapter.id">
                  <tr class="group-row sub">
                    <td colspan="3">
                      <div class="group-inner">
                        <span class="g-sub">תת פרק {{ sg.subChapter.num }} - {{ sg.subChapter.name }}</span>
                        <AppIcon name="note" :size="16" class="note-ico" />
                      </div>
                    </td>
                  </tr>
                  <tr
                    v-for="item in sg.items"
                    :key="item.id"
                    class="item-row"
                    :class="{ tagged: hasTag(item) }"
                  >
                    <td class="td-check">
                      <BaseCheckbox
                        :model-value="hasTag(item)"
                        @update:model-value="(v) => setTag(item, v)"
                      />
                    </td>
                    <td>
                      <span class="item-code">{{ item.code }}</span>
                    </td>
                    <td class="ellipsis">{{ item.name }}</td>
                  </tr>
                </template>
              </template>
              <tr v-if="!groups.length">
                <td colspan="3" class="empty">אין סעיפים בתגית זו — חפש סעיף כדי לשייך אותו לתגית</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>

    <ContextMenu
      v-if="tagMenu"
      :items="[
        { key: 'rename', label: 'שינוי שם', icon: 'pencil' },
        { key: 'delete', label: 'מחיקה', icon: 'trash', danger: true },
      ]"
      :x="tagMenu.x"
      :y="tagMenu.y"
      @select="onTagMenu"
      @close="tagMenu = null"
    />
    <DeleteConfirmModal
      v-if="deleteTag"
      title="מחיקת תגית"
      :message="`האם למחוק את התגית &quot;${deleteTag.name}&quot;?`"
      detail="התגית תוסר מכל הסעיפים המשויכים לה"
      @close="deleteTag = null"
      @confirm="confirmDeleteTag"
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
/* tags panel */
.tags-panel {
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
.tag-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.tag-row {
  display: flex;
  align-items: center;
  height: 32px;
  border-radius: 8px;
  padding: 0 8px 0 4px;
  cursor: pointer;
  font-size: 14px;
}
.tag-row:hover {
  background: var(--surface-subtle);
}
.tag-row.active {
  background: var(--brand-primary-soft);
}
.tag-name {
  flex: 1;
  text-align: right;
}
.tag-input {
  flex: 1;
  border: 1px solid #6952ef;
  border-radius: 6px;
  padding: 3px 6px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
}
.tag-kebab {
  background: none;
  border: none;
  color: var(--text-secondary);
  opacity: 0;
  display: inline-flex;
  padding: 2px;
}
.tag-row:hover .tag-kebab {
  opacity: 1;
}
/* main */
.main {
  flex: 1;
  min-width: 0;
  padding: 0 0 0 8px;
}
.tag-title {
  font-size: 16px;
  font-weight: 700;
  text-align: right;
  margin: 4px 8px 10px;
}
.items-table {
  width: 100%;
  border-collapse: collapse;
}
.items-table th {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
  padding: 8px 10px;
  border-bottom: 1px solid var(--divider);
  background: var(--surface-subtle);
}
.items-table td {
  font-size: 13px;
  text-align: right;
  padding: 8px 10px;
  border-bottom: 1px solid var(--divider);
  height: 44px;
}
.group-row td {
  background: var(--surface-subtle);
  height: 36px;
}
.group-inner {
  display: flex;
  align-items: center;
  gap: 8px;
}
.g-title {
  font-weight: 700;
}
.g-sub {
  padding-right: 16px;
}
.note-ico {
  color: var(--brand-primary);
}
.item-row:hover {
  background: var(--surface-subtle);
}
.item-row.tagged {
  background: var(--brand-primary-soft);
}
.th-check {
  width: 40px;
}
.empty {
  text-align: center;
  color: var(--text-muted);
  padding: 40px 0;
}
</style>
