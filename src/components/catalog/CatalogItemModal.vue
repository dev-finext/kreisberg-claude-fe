<script setup>
import { reactive, ref, computed } from "vue";
import { useDbStore } from "@/stores/db";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { PRIORITY, PRIORITY_LABELS } from "@/constants";
import AppIcon from "@/components/shared/AppIcon.vue";
import { useEscape } from "@/composables/useEscape";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import ItemPickerModal from "@/components/boq/ItemPickerModal.vue";

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
const tagDraft = ref("");
const picker = ref(null); // 'sub' | 'parent' | 'alt'

const resources = computed(() =>
  form.resourceTypeId ? db.constructors.filter((c) => c.typeId === form.resourceTypeId) : db.constructors
);
const tagNames = computed(() => form.tagIds.map((id) => cat.tagById.get(id)?.name).filter(Boolean));
const parentItem = computed(() => (form.parentId ? cat.item(form.parentId) : null));
const childItems = computed(() => (props.item ? cat.childrenOf(props.item.id) : []));
const alternatives = computed(() => form.alternativeIds.map((id) => cat.item(id)).filter(Boolean));
const subItemRows = computed(() =>
  form.subItems.map((s) => ({ ...s, item: cat.item(s.itemId) })).filter((s) => s.item)
);
const valid = computed(
  () => form.code.trim() && form.name.trim() && (!form.isComposite || form.subItems.length >= 2)
);

function addTag() {
  const name = tagDraft.value.trim();
  if (!name) return;
  let tag = db.tags.find((t) => t.name === name);
  if (!tag) {
    tag = { id: db.nextId("tags"), name };
    db.db.tags.push(tag);
    db.persist();
    ui.toast(`התגית "${name}" נוצרה`);
  }
  if (!form.tagIds.includes(tag.id)) form.tagIds.push(tag.id);
  tagDraft.value = "";
}
function removeTag(id) {
  form.tagIds = form.tagIds.filter((t) => t !== id);
}
function onPicked(ids) {
  if (picker.value === "sub") {
    for (const id of ids)
      if (!form.subItems.some((s) => s.itemId === id)) form.subItems.push({ itemId: id, qty: 1 });
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

/* notes */
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
}

function save() {
  if (!valid.value) return;
  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || form.name.trim(),
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
      <div class="cim">
        <div class="cim-header">
          <div class="h-start">
            <button class="icon-btn" @click="emit('close')"><AppIcon name="cancel" :size="20" /></button>
            <span class="cat-lbl">{{ catalogName }}</span>
          </div>
          <div class="h-end">
            <h2 class="cim-title">{{ item ? "עריכת סעיף" : "הוספת סעיף" }}</h2>
            <p class="cim-sub">פרק {{ chapter?.num }}, תת פרק {{ subChapter.num }}</p>
          </div>
        </div>

        <div class="composite-row">
          <BaseToggle v-model="form.isComposite" />
          <span class="composite-lbl">סעיף מורכב</span>
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
              <div class="desc-box">
                <div class="desc-toolbar" title="עורך טקסט">
                  <span class="dt">B</span><span class="dt"><i>I</i></span
                  ><span class="dt"><u>U</u></span
                  ><span class="dt"><s>S</s></span>
                </div>
                <textarea
                  v-model="form.description"
                  class="desc-input scroll-slim"
                  placeholder="כתוב תיאור סעיף"
                />
              </div>
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
                <div class="pct">
                  <input v-model="form.amortization" type="number" min="0" max="100" class="input num" />
                  <span class="pct-sign">%</span>
                </div>
              </div>
              <div class="field">
                <label class="field-label">עדיפות</label>
                <select v-model="form.priority" class="select">
                  <option v-for="(l, v) in PRIORITY_LABELS" :key="v" :value="v">{{ l }}</option>
                </select>
              </div>
            </div>

            <div class="row-2">
              <div class="field">
                <label class="field-label">סוג משאב</label>
                <select v-model="form.resourceTypeId" class="select">
                  <option :value="null">בחר סוג משאב</option>
                  <option v-for="rt in db.resourceTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
                </select>
              </div>
              <div class="field grow">
                <label class="field-label">משאב</label>
                <select v-model="form.resourceId" class="select">
                  <option :value="null">בחר משאב</option>
                  <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.name }}</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label class="field-label">תגיות</label>
              <div class="tags-field">
                <span v-for="(n, i) in tagNames" :key="n" class="tag-chip">
                  {{ n }}
                  <button class="chip-x" @click="removeTag(form.tagIds[i])">
                    <AppIcon name="cancel" :size="10" />
                  </button>
                </span>
                <input
                  v-model="tagDraft"
                  list="cim-tag-options"
                  class="tag-input"
                  placeholder="בחר/הקלד ליצירת תגית חדשה"
                  @keyup.enter="addTag"
                  @blur="addTag"
                />
                <datalist id="cim-tag-options">
                  <option v-for="t in db.tags" :key="t.id" :value="t.name" />
                </datalist>
              </div>
            </div>

            <!-- composite sub-items -->
            <div v-if="form.isComposite" class="sub-section">
              <div class="sub-head">
                <button class="btn-text add-sub" @click="picker = 'sub'">
                  <AppIcon name="plus-circle" :size="18" />
                  <span>הוספת תתי סעיפים</span>
                </button>
                <h4 class="sub-title">תתי סעיפים ({{ form.subItems.length }})</h4>
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
                  <tr v-for="s in subItemRows" :key="s.itemId">
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
                      <button class="icon-btn danger" @click="removeSubItem(s.itemId)">
                        <AppIcon name="trash" :size="15" />
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
              <div class="note-meta">
                <span class="author">{{ n.author }}</span>
              </div>
              <p>{{ n.text }}</p>
            </div>
          </template>

          <!-- קשורים -->
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

          <!-- חלופיים -->
          <template v-else>
            <div v-if="alternatives.length" class="list">
              <div v-for="a in alternatives" :key="a.id" class="list-row">
                <span class="item-code">{{ a.code }}</span>
                <span class="ellipsis">{{ a.name }}</span>
                <button
                  class="icon-btn danger"
                  @click="form.alternativeIds = form.alternativeIds.filter((x) => x !== a.id)"
                >
                  <AppIcon name="trash" :size="15" />
                </button>
              </div>
            </div>
            <p v-else class="hint">לא הוגדרו סעיפים חלופיים</p>
            <button class="btn-text" @click="picker = 'alt'">הוספה</button>
          </template>
        </div>

        <div class="cim-footer">
          <div class="f-start">
            <button class="btn btn-primary" :disabled="!valid" @click="save">שמירה</button>
            <button class="btn btn-secondary" @click="emit('close')">ביטול</button>
          </div>
          <button v-if="item" class="btn-danger-text" @click="remove">
            <AppIcon name="trash" :size="16" />
            <span>מחיקת סעיף</span>
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
  width: 820px;
  max-width: 95vw;
  max-height: 92vh;
  background: var(--surface);
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  padding: 8px 0 0;
}
.cim-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: row-reverse;
  padding: 10px 32px 4px;
}
.h-end {
  text-align: right;
}
.cim-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
}
.cim-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.h-start {
  display: flex;
  align-items: center;
  gap: 8px;
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
  padding: 2px;
}
.icon-btn.danger {
  color: var(--danger);
}
.composite-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row-reverse;
  padding: 8px 32px 4px;
}
.composite-lbl {
  font-size: 13px;
  font-weight: 600;
}
.cim-tabs {
  display: flex;
  padding: 0 32px;
  border-bottom: 1.5px solid var(--divider);
}
.tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1.5px;
  padding: 8px 18px;
  font-size: 14px;
  color: var(--text-secondary);
  font-family: inherit;
}
.tab.active {
  color: var(--brand-primary);
  border-bottom-color: var(--brand-primary);
  font-weight: 500;
}
.cim-body {
  padding: 18px 32px;
  overflow-y: auto;
  flex: 1;
  text-align: right;
}
.field {
  margin-bottom: 14px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
  text-align: right;
}
.row-code-name,
.row-2 {
  display: flex;
  gap: 16px;
}
.row-code-name .code {
  width: 160px;
  flex-shrink: 0;
}
.grow {
  flex: 1;
}
.row-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.desc-box {
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  overflow: hidden;
}
.desc-toolbar {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--divider);
  padding: 6px 10px;
  color: var(--text-secondary);
}
.dt {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.desc-input {
  width: 100%;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13px;
  min-height: 96px;
  resize: vertical;
  text-align: right;
}
.pct {
  position: relative;
}
.pct-sign {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 13px;
}
.tags-field {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: var(--input-h);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 4px 8px;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--brand-primary-soft);
  color: var(--text-primary);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
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
  min-width: 140px;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  text-align: right;
}
.sub-section {
  margin-top: 6px;
  border-top: 1px solid var(--divider);
  padding-top: 12px;
}
.sub-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  margin-bottom: 8px;
}
.sub-title {
  font-size: 13px;
  font-weight: 700;
}
.add-sub {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-direction: row-reverse;
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
  color: var(--text-secondary);
  font-weight: 500;
  text-align: right;
  padding: 6px 10px;
  background: var(--surface-subtle);
}
.nested td {
  font-size: 13px;
  text-align: right;
  padding: 5px 10px;
  border-top: 1px solid var(--divider);
  height: 40px;
}
.qty {
  width: 72px;
  height: 30px;
  text-align: center;
}
.hint {
  font-size: 13px;
  color: var(--text-muted);
  padding: 8px 0;
}
.note-editor {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 10px;
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
  background: var(--surface-muted);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  font-size: 13px;
}
.note-meta {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 3px;
}
.author {
  font-weight: 600;
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
  margin-bottom: 8px;
}
.list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--divider);
}
.list-row:last-child {
  border-bottom: none;
}
.list-row .ellipsis {
  flex: 1;
}
.cim-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  border-top: 1.5px solid var(--divider);
  padding: 14px 32px;
}
.f-start {
  display: flex;
  gap: 12px;
}
</style>
