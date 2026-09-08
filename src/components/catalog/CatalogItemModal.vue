<script setup>
import { reactive, ref, computed, nextTick } from "vue";
import { useDbStore } from "@/stores/db";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { PRIORITY, PRIORITY_LABELS } from "@/constants";
import AppIcon from "@/components/shared/AppIcon.vue";
import { useEscape } from "@/composables/useEscape";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import ItemPickerModal from "@/components/boq/ItemPickerModal.vue";
import RichTextEditor from "@/components/shared/RichTextEditor.vue";
import { formatDateTime } from "@/utils/format";
import { sanitizeHtml, stripHtml } from "@/utils/html";
import { useFlash } from "@/composables/useFlash";

const props = defineProps({
  /** existing item (edit) or null (create) */
  item: { type: Object, default: null },
  subChapter: { type: Object, required: true },
  /** 'regular' | 'composite' — initial type when creating */
  initialType: { type: String, default: "regular" },
  catalogName: { type: String, default: "" },
});
const emit = defineEmits(["close", "saved", "deleted"]);
useEscape(() => emit("close"));

const db = useDbStore();
const cat = useCatalogStore();
const ui = useUiStore();

const UNITS = ['מ"ר', 'מ"ק', 'מ"א', "מטר", "יח'", "קומפ'", "נק'", 'ש"ע', "טון", 'ק"ג', "שעה"];
const AMORT = [0, 3, 5, 8, 10, 12, 15, 20, 25, 30];
/* right-to-left the tabs read פרטים · הערות · סעיפים קשורים · סעיפים חלופיים */
const TABS = [
  { id: "details", label: "פרטים" },
  { id: "notes", label: "הערות" },
  { id: "related", label: "סעיפים קשורים" },
  { id: "alternatives", label: "סעיפים חלופיים" },
];
const activeTab = ref("details");
const chapter = computed(() => cat.chapter(props.subChapter.chapterId));

const form = reactive({
  isComposite: (props.item?.type || props.initialType) === "composite",
  code:
    props.item?.code ||
    `${props.subChapter.code.replace(/\.0000$/, "")}.${String(props.subChapter.items.length + 1).padStart(4, "0")}`,
  name: props.item?.name || "",
  description: props.item?.description || "",
  unit: props.item?.unit || 'מ"ר',
  unit2: props.item?.unit2 || "",
  amortization: props.item?.amortization ?? 0,
  priority: props.item?.priority || PRIORITY.RECOMMENDED,
  resourceTypeId: props.item?.resourceTypeId ?? 1,
  resourceId: props.item?.resourceId ?? null,
  tagIds: [...(props.item?.tags || [])],
  subItems: JSON.parse(JSON.stringify(props.item?.subItems || [])),
  parentId: props.item?.parentId ?? null,
  alternativeIds: [...(props.item?.alternativeIds || [])],
});
const picker = ref(null); // 'sub' | 'parent' | 'alt'
const flashSubItems = useFlash("subitem");

const resources = computed(() =>
  form.resourceTypeId ? db.constructors.filter((c) => c.typeId === form.resourceTypeId) : db.constructors
);
const parentItem = computed(() => (form.parentId ? cat.item(form.parentId) : null));
const childItems = computed(() => (props.item ? cat.childrenOf(props.item.id) : []));
const alternatives = computed(() => form.alternativeIds.map((id) => cat.item(id)).filter(Boolean));
const subItemRows = computed(() =>
  form.subItems.map((s) => ({ ...s, item: cat.item(s.itemId) })).filter((s) => s.item)
);
const valid = computed(
  () => form.code.trim() && form.name.trim() && (!form.isComposite || form.subItems.length >= 2)
);

/* ---------- tags: pick an existing one or type a new name (Figma "בחירת תגית קיימת") ---------- */
const tagDraft = ref("");
const tagOpen = ref(false);
const tagIdx = ref(0);
const tagInput = ref(null);
const chosenTags = computed(() => form.tagIds.map((id) => cat.tagById.get(id)).filter(Boolean));
const tagMatches = computed(() => {
  const q = tagDraft.value.trim();
  return db.tags.filter((t) => !form.tagIds.includes(t.id) && (!q || t.name.includes(q)));
});
const canCreateTag = computed(() => {
  const q = tagDraft.value.trim();
  return !!q && !db.tags.some((t) => t.name === q);
});
function openTags() {
  tagOpen.value = true;
  tagIdx.value = 0;
}
function pickTag(tag) {
  if (!form.tagIds.includes(tag.id)) form.tagIds.push(tag.id);
  tagDraft.value = "";
  tagIdx.value = 0;
  nextTick(() => tagInput.value?.focus());
}
function createTag() {
  const name = tagDraft.value.trim();
  if (!name) return;
  const tag = { id: db.nextId("tags"), name };
  db.db.tags.push(tag);
  db.persist();
  ui.toast(`תגית "${name}" נוצרה ונוספה למערכת בהצלחה.`, "success", {
    label: "למסך ניהול תגיות",
    to: "/system/tags",
  });
  pickTag(tag);
}
function removeTag(id) {
  form.tagIds = form.tagIds.filter((t) => t !== id);
}
function onTagKeydown(e) {
  const rows = tagMatches.value.length + (canCreateTag.value ? 1 : 0);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    tagOpen.value = true;
    if (!rows) return;
    tagIdx.value = (tagIdx.value + (e.key === "ArrowDown" ? 1 : -1) + rows) % rows;
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (tagIdx.value < tagMatches.value.length) {
      const t = tagMatches.value[tagIdx.value];
      if (t) pickTag(t);
    } else if (canCreateTag.value) createTag();
  } else if (e.key === "Escape") {
    e.stopPropagation();
    tagOpen.value = false;
  } else if (e.key === "Backspace" && !tagDraft.value && form.tagIds.length) {
    form.tagIds.pop();
  }
}

function onPicked(ids) {
  if (picker.value === "sub") {
    const added = [];
    for (const id of ids)
      if (!form.subItems.some((s) => s.itemId === id)) {
        form.subItems.push({ itemId: id, qty: 1 });
        added.push(id);
      }
    flashSubItems.flash(added);
  } else if (picker.value === "parent") {
    form.parentId = ids[0] || null;
  } else if (picker.value === "alt") {
    form.alternativeIds = ids.filter((id) => id !== props.item?.id);
  }
  picker.value = null;
}
function removeSubItem(itemId) {
  form.subItems = form.subItems.filter((s) => s.itemId !== itemId);
}

/* ---------- notes tab ---------- */
const noteDraft = ref("");
const notes = computed(() =>
  props.item ? db.comments.filter((c) => c.scope === "item" && c.refId === props.item.id) : []
);
function addNote() {
  if (!noteDraft.value.trim() || !props.item) return;
  db.db.comments.push({
    id: db.nextId("comments"),
    scope: "item",
    refId: props.item.id,
    boqId: null,
    author: db.currentUser.name,
    ts: new Date().toISOString(),
    text: noteDraft.value.trim(),
  });
  db.persist();
  noteDraft.value = "";
  ui.toast("ההערה נוספה בהצלחה");
}
function removeNote(id) {
  db.db.comments = db.db.comments.filter((c) => c.id !== id);
  db.persist();
  ui.toast("ההערה נמחקה");
}

function save() {
  if (!valid.value) return;
  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    description: stripHtml(form.description) ? form.description : form.name.trim(),
    unit: form.isComposite ? "קומפ'" : form.unit,
    unit2: form.unit2,
    amortization: Number(form.amortization) || 0,
    priority: form.priority,
    resourceTypeId: form.resourceTypeId,
    resourceId: form.resourceId,
    tags: [...form.tagIds],
    type: form.isComposite ? "composite" : "regular",
    subItems: form.isComposite
      ? form.subItems.map((s) => ({ itemId: s.itemId, qty: Number(s.qty) || 1 }))
      : [],
    parentId: form.parentId,
    alternativeIds: [...form.alternativeIds],
  };
  const liveSubChapter = cat.subChapter(props.subChapter.id);
  if (props.item) {
    const liveItem = cat.item(props.item.id);
    Object.assign(liveItem, payload);
    db.persist();
    ui.toast("הסעיף עודכן בהצלחה");
    emit("saved", liveItem);
  } else {
    const maxId = db.allItems.reduce((m, i) => Math.max(m, i.id), 0);
    const item = {
      id: maxId + 1,
      key: `${payload.code}|${payload.name}`,
      subChapterId: props.subChapter.id,
      chapterId: props.subChapter.chapterId,
      isNote: false,
      ...payload,
    };
    liveSubChapter.items.push(item);
    db.persist();
    ui.toast("הסעיף נוסף לקטלוג");
    emit("saved", item);
  }
}
function remove() {
  if (!props.item) return;
  const liveSubChapter = cat.subChapter(props.subChapter.id);
  const idx = liveSubChapter.items.findIndex((i) => i.id === props.item.id);
  if (idx >= 0) liveSubChapter.items.splice(idx, 1);
  db.persist();
  ui.toast("הסעיף נמחק מהקטלוג");
  emit("deleted", props.item);
}
</script>

<template>
  <Teleport to="body">
    <div class="cim-overlay" @mousedown.self="emit('close')">
      <!-- Figma "Popup branches-catalog" / "Popup section edit": 822 wide, 758 content -->
      <div class="cim">
        <div class="cim-header">
          <div class="h-start">
            <button class="icon-btn" title="סגירה" @click="emit('close')">
              <AppIcon name="cancel" :size="24" />
            </button>
            <span class="cat-lbl">{{ catalogName }}</span>
          </div>
          <div class="h-end">
            <h2 class="cim-title">{{ item ? "עריכת סעיף" : "הוספת סעיף" }}</h2>
            <p class="cim-sub">פרק {{ chapter?.num }}, תת פרק {{ subChapter.num }}</p>
          </div>
        </div>

        <div class="composite-row">
          <span class="composite-lbl">סעיף מורכב</span>
          <BaseToggle v-model="form.isComposite" />
        </div>

        <div class="cim-tabs">
          <button
            v-for="t in TABS"
            :key="t.id"
            class="tab"
            :class="{ active: activeTab === t.id }"
            @click="activeTab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <div class="cim-body scroll-slim">
          <!-- פרטים -->
          <template v-if="activeTab === 'details'">
            <div class="row-code-name">
              <div class="field code">
                <label class="field-label">מס' סעיף</label>
                <input v-model="form.code" class="input num" />
              </div>
              <div class="field grow">
                <label class="field-label">שם סעיף</label>
                <input v-model="form.name" class="input" placeholder="הקלד שם סעיף" />
              </div>
            </div>

            <div class="field">
              <label class="field-label">תיאור סעיף</label>
              <RichTextEditor v-model="form.description" placeholder="כתוב תיאור סעיף" min-height="104px" />
            </div>

            <div class="row-4">
              <div class="field">
                <label class="field-label">יחידת מידה ראשית</label>
                <select
                  v-model="form.unit"
                  class="select"
                  :disabled="form.isComposite"
                  :title="form.isComposite ? 'לסעיף מורכב יחידת המידה היא קומפ׳' : ''"
                >
                  <option v-if="form.isComposite" value="קומפ'">קומפ'</option>
                  <option v-for="u in UNITS" :key="u">{{ u }}</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">יחידת מידה משנית</label>
                <select v-model="form.unit2" class="select">
                  <option value="">—</option>
                  <option v-for="u in UNITS" :key="u">{{ u }}</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">פחת</label>
                <select v-model.number="form.amortization" class="select">
                  <option v-for="a in AMORT" :key="a" :value="a">{{ a }}%</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">עדיפות</label>
                <select v-model="form.priority" class="select">
                  <option v-for="(l, v) in PRIORITY_LABELS" :key="v" :value="v">{{ l }}</option>
                </select>
              </div>
            </div>

            <!-- right column: סוג משאב over תגיות · left column: משאב -->
            <div class="row-res">
              <div class="res-col">
                <div class="field">
                  <label class="field-label">סוג משאב</label>
                  <select v-model="form.resourceTypeId" class="select">
                    <option :value="null">בחר סוג משאב</option>
                    <option v-for="rt in db.resourceTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
                  </select>
                </div>
                <div class="field tag-field">
                  <label class="field-label">תגיות</label>
                  <div class="tags-field" :class="{ open: tagOpen }" @click="tagInput?.focus()">
                    <span v-for="t in chosenTags" :key="t.id" class="tag-chip">
                      {{ t.name }}
                      <button class="chip-x" title="הסרה" @click.stop="removeTag(t.id)">
                        <AppIcon name="cancel" :size="10" />
                      </button>
                    </span>
                    <input
                      ref="tagInput"
                      v-model="tagDraft"
                      class="tag-input"
                      :placeholder="chosenTags.length ? '' : 'בחר/הקלד ליצירת תגית חדשה'"
                      @focus="openTags"
                      @blur="tagOpen = false"
                      @keydown="onTagKeydown"
                    />
                    <AppIcon class="tag-caret" name="chevron-down" :size="24" />
                  </div>
                  <!-- existing-tag picker -->
                  <div v-if="tagOpen && (tagMatches.length || canCreateTag)" class="tag-menu scroll-slim">
                    <button
                      v-for="(t, i) in tagMatches"
                      :key="t.id"
                      class="tag-opt"
                      :class="{ hl: i === tagIdx }"
                      @mousedown.prevent="pickTag(t)"
                    >
                      {{ t.name }}
                    </button>
                    <button
                      v-if="canCreateTag"
                      class="tag-opt create"
                      :class="{ hl: tagIdx === tagMatches.length }"
                      @mousedown.prevent="createTag"
                    >
                      <AppIcon name="plus-circle" :size="16" />
                      <span>יצירת התגית "{{ tagDraft.trim() }}"</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="res-col res-left">
                <div class="field">
                  <label class="field-label">משאב</label>
                  <select v-model="form.resourceId" class="select">
                    <option :value="null">בחר משאב</option>
                    <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.name }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- composite sub-items -->
            <div v-if="form.isComposite" class="sub-section">
              <div class="sub-head">
                <h4 class="sub-title">תתי סעיפים ({{ form.subItems.length }})</h4>
                <button class="btn-text add-sub" @click="picker = 'sub'">
                  <span>הוספת תתי סעיפים</span>
                  <AppIcon name="plus-circle" :size="24" />
                </button>
              </div>
              <table v-if="subItemRows.length" class="nested">
                <thead>
                  <tr>
                    <th>מס' סעיף</th>
                    <th>שם סעיף</th>
                    <th>יח' מידה</th>
                    <th>כמות</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="s in subItemRows"
                    :key="s.itemId"
                    :class="{ 'flash-new': flashSubItems.isNew(s.itemId) }"
                    :data-flash="flashSubItems.mark(s.itemId)"
                  >
                    <td>
                      <span class="item-code">{{ s.item.code }}</span>
                    </td>
                    <td class="ellipsis">{{ s.item.name }}</td>
                    <td>{{ s.item.unit }}</td>
                    <td>
                      <input
                        v-model="s.qty"
                        type="number"
                        min="0"
                        class="input qty num"
                        @change="form.subItems.find((x) => x.itemId === s.itemId).qty = Number(s.qty)"
                      />
                    </td>
                    <td>
                      <button class="icon-btn danger" title="הסרה" @click="removeSubItem(s.itemId)">
                        <AppIcon name="trash" :size="18" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-else class="hint">סעיף מורכב חייב לכלול לפחות שני תתי סעיפים</p>
            </div>
          </template>

          <!-- הערות -->
          <template v-else-if="activeTab === 'notes'">
            <div class="note-editor">
              <textarea
                v-model="noteDraft"
                class="input note-input"
                rows="2"
                placeholder="כתוב הערה..."
                :disabled="!item"
              />
              <button class="btn btn-primary btn-sm" :disabled="!item || !noteDraft.trim()" @click="addNote">
                הוספת הערה
              </button>
            </div>
            <p v-if="!item" class="hint">ניתן להוסיף הערות לאחר שמירת הסעיף</p>
            <div v-for="n in notes" :key="n.id" class="note-card">
              <div class="note-head">
                <span class="author">{{ n.author }} · {{ formatDateTime(n.ts) }}</span>
                <button class="icon-btn danger" title="מחיקה" @click="removeNote(n.id)">
                  <AppIcon name="trash" :size="18" />
                </button>
              </div>
              <p v-html="sanitizeHtml(n.text)"></p>
            </div>
            <p v-if="item && !notes.length" class="hint">אין הערות עדיין</p>
          </template>

          <!-- סעיפים קשורים -->
          <template v-else-if="activeTab === 'related'">
            <div class="field">
              <label class="field-label">סעיף אב</label>
              <div class="parent-field">
                <input
                  class="input"
                  :value="parentItem ? `${parentItem.code} · ${parentItem.name}` : ''"
                  placeholder="לא הוגדר סעיף אב"
                  disabled
                />
                <button class="btn-text" @click="picker = 'parent'">בחירה</button>
                <button v-if="parentItem" class="btn-danger-text" @click="form.parentId = null">
                  <AppIcon name="cancel" :size="14" />
                </button>
              </div>
            </div>
            <div class="field">
              <label class="field-label">סעיפים בנים (להצגה בלבד)</label>
              <div v-if="childItems.length" class="list">
                <div v-for="c in childItems" :key="c.id" class="list-row">
                  <span class="item-code">{{ c.code }}</span
                  ><span class="ellipsis">{{ c.name }}</span>
                </div>
              </div>
              <p v-else class="hint">אין סעיפים בנים</p>
            </div>
          </template>

          <!-- סעיפים חלופיים -->
          <template v-else>
            <div v-if="alternatives.length" class="list">
              <div v-for="a in alternatives" :key="a.id" class="list-row">
                <span class="item-code">{{ a.code }}</span>
                <span class="ellipsis">{{ a.name }}</span>
                <button
                  class="icon-btn danger"
                  title="הסרה"
                  @click="form.alternativeIds = form.alternativeIds.filter((x) => x !== a.id)"
                >
                  <AppIcon name="trash" :size="18" />
                </button>
              </div>
            </div>
            <p v-else class="hint">לא הוגדרו סעיפים חלופיים</p>
            <button class="btn-text add-sub" @click="picker = 'alt'">
              <span>הוספת סעיפים חלופיים</span>
              <AppIcon name="plus-circle" :size="24" />
            </button>
          </template>
        </div>

        <div class="cim-footer">
          <div class="f-start">
            <button class="btn btn-primary" :disabled="!valid" @click="save">שמירה</button>
            <button class="btn btn-secondary" @click="emit('close')">ביטול</button>
          </div>
          <button v-if="item" class="del-btn" @click="remove">
            <span>מחיקת סעיף</span>
            <AppIcon name="trash" :size="24" />
          </button>
        </div>
      </div>
    </div>
    <ItemPickerModal
      v-if="picker"
      :mode="picker === 'parent' ? 'single' : 'multi'"
      :catalog-name="catalogName"
      :already-selected="picker === 'sub' ? form.subItems.map((s) => s.itemId) : item ? [item.id] : []"
      @close="picker = null"
      @picked="onPicked"
    />
  </Teleport>
</template>

<style scoped>
.cim-overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 44, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 65;
}
.cim {
  width: 822px;
  max-width: 95vw;
  max-height: 92vh;
  background: var(--surface);
  border-radius: 6px;
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 32px;
}
/* header: title block on the right, close + catalog name on the left */
.cim-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: row-reverse;
}
.h-end {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cim-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  color: var(--text-secondary);
}
.cim-sub {
  font-size: 14px;
  line-height: 18px;
  color: var(--text-primary);
}
.h-start {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row-reverse;
}
.cat-lbl {
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
.icon-btn.danger {
  color: var(--danger);
}
/* סעיף מורכב sits on the right edge, label then toggle */
.composite-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 24px;
}
.composite-lbl {
  font-size: 14px;
  line-height: 18px;
  color: var(--text-primary);
}
/* tabs: each carries its own 2px underline (gray-light, blue when active) */
.cim-tabs {
  display: flex;
  height: 34px;
}
.tab {
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
.tab.active {
  color: var(--brand-primary);
  border-bottom-color: var(--brand-primary);
  font-weight: 500;
}
.cim-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
  text-align: right;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  line-height: 14px;
  color: var(--text-primary);
  padding: 0 8px;
  text-align: right;
}
.row-code-name,
.row-res {
  display: flex;
  gap: 24px;
}
.row-code-name .code {
  width: 171px;
  flex-shrink: 0;
}
.grow {
  flex: 1;
  min-width: 0;
}
.row-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}
.res-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.res-left {
  align-self: flex-start;
  width: 367px;
  flex: 0 0 367px;
}
/* tags combo */
.tag-field {
  position: relative;
}
.tags-field {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 40px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 4px 8px;
  cursor: text;
  background: var(--surface);
}
.tags-field.open {
  border-color: var(--brand-primary);
}
.tag-caret {
  color: var(--text-secondary);
  flex-shrink: 0;
  order: 99;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-muted);
  border: 1px solid var(--text-secondary);
  color: var(--text-secondary);
  border-radius: 20px;
  height: 24px;
  padding: 0 12px;
  font-size: 14px;
}
.chip-x {
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
  padding: 0;
}
.tag-input {
  flex: 1;
  min-width: 120px;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
  background: none;
}
.tag-input::placeholder {
  color: var(--text-disabled);
}
.tag-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 5;
  max-height: 208px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(16, 37, 86, 0.14);
  padding: 4px;
  display: flex;
  flex-direction: column;
}
.tag-opt {
  display: flex;
  align-items: center;
  gap: 6px;
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
.tag-opt.hl,
.tag-opt:hover {
  background: var(--brand-primary-soft);
}
.tag-opt.create {
  color: var(--brand-primary);
  font-weight: 600;
}
/* composite sub-items */
.sub-section {
  border-top: 1px solid var(--divider);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sub-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sub-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.add-sub {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
}
.nested {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
}
.nested th {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
  padding: 6px 12px;
  background: var(--page-bg);
}
.nested td {
  font-size: 14px;
  text-align: right;
  padding: 5px 12px;
  border-top: 1px solid #eeeefc;
  height: 48px;
}
.qty {
  width: 72px;
  height: 32px;
  text-align: center;
}
.hint {
  font-size: 13px;
  color: var(--text-muted);
}
.note-editor {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.note-input {
  height: auto;
  padding: 8px 10px;
}
.btn-sm {
  height: 32px;
  min-width: 100px;
  font-size: 12px;
}
.note-card {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 18px;
}
.note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.author {
  font-size: 12px;
  color: var(--text-secondary);
}
.parent-field {
  display: flex;
  gap: 8px;
  align-items: center;
}
.list {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  font-size: 14px;
  border-bottom: 1px solid var(--divider);
}
.list-row:last-child {
  border-bottom: none;
}
.list-row .ellipsis {
  flex: 1;
}
/* footer: שמירה / ביטול on the left, מחיקת סעיף on the right */
.cim-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  height: 40px;
}
.f-start {
  display: flex;
  gap: 12px;
  flex-direction: row-reverse;
}
.del-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  padding: 0 8px;
  height: 40px;
  border-radius: var(--radius-pill);
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
}
</style>
