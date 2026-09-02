<script setup>
import { reactive, ref, computed } from "vue";
import { useDbStore } from "@/stores/db";
import { useBoqStore } from "@/stores/boq";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";
import PriorityControl from "./PriorityControl.vue";

const props = defineProps({
  row: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const db = useDbStore();
const boq = useBoqStore();
const cat = useCatalogStore();
const ui = useUiStore();

const item = props.row.item;
const chapter = cat.chapter(item.chapterId);
const subChapter = cat.subChapter(item.subChapterId);

const TABS = [
  { id: "details", label: "פרטים" },
  { id: "notes", label: "הערות" },
  { id: "related", label: "סעיפים קשורים" },
  { id: "alternatives", label: "סעיפים חלופיים" },
];
const activeTab = ref("details");

const form = reactive({
  name: item.name,
  code: item.code,
  unit: item.unit,
  unit2: item.unit2,
  resourceTypeId: props.row.bi?.resourceTypeId ?? item.resourceTypeId,
  resourceId: props.row.bi?.resourceId ?? null,
  priority: props.row.priority,
  amortization: props.row.bi?.amortization ?? 0,
  description: props.row.description,
  tags: item.tags.map((t) => cat.tagById.get(t)?.name).filter(Boolean),
});

const resources = computed(() =>
  form.resourceTypeId ? db.constructors.filter((c) => c.typeId === form.resourceTypeId) : []
);
const parentItem = computed(() => (item.parentId ? cat.item(item.parentId) : null));
const childItems = computed(() => cat.childrenOf(item.id));
const alternatives = computed(() => boq.alternativesOf(item.id));

const noteDraft = ref("");
const notes = computed(() => boq.commentsFor("item", item.id));
function addNote() {
  if (!noteDraft.value.trim()) {
    ui.toast("נא לכתוב הערה לפני השמירה", "warning");
    return;
  }
  boq.addComment("item", item.id, noteDraft.value.trim());
  noteDraft.value = "";
}

function save() {
  boq.updateBoqItem(item.id, {
    resourceTypeId: form.resourceTypeId,
    resourceId: form.resourceId,
    amortization: parseFloat(form.amortization) || 0,
    description: form.description,
  });
  if (form.priority !== props.row.priority) boq.setPriority(item.id, form.priority);
  ui.toast("הסעיף עודכן בהצלחה");
  emit("close");
}
function deleteFromBoq() {
  boq.deleteSeis(props.row.seiIds);
  ui.toast("הסעיף הוסר מכתב הכמויות");
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div class="iem-overlay" @mousedown.self="emit('close')">
      <div class="iem">
        <!-- sticky header: chapter > sub-chapter only (item name removed per design ruling) -->
        <div class="iem-header">
          <button class="icon-btn" @click="emit('close')"><AppIcon name="cancel" :size="20" /></button>
          <h2 class="iem-title">
            עריכת סעיף : פרק: {{ chapter?.name }} &gt; תת-פרק: {{ subChapter?.name }}
          </h2>
        </div>
        <div class="iem-tabs">
          <button
            v-for="t in TABS"
            :key="t.id"
            class="iem-tab"
            :class="{ active: activeTab === t.id }"
            @click="activeTab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <div class="iem-body scroll-slim">
          <!-- פרטים -->
          <template v-if="activeTab === 'details'">
            <div class="grid-2">
              <div class="field">
                <label class="field-label">שם סעיף</label>
                <input class="input" :value="form.name" disabled />
              </div>
              <div class="field">
                <label class="field-label">מס' סעיף</label>
                <input class="input num" :value="form.code" disabled />
              </div>
              <div class="field">
                <label class="field-label">יחידת מידה ראשית</label>
                <input class="input" :value="form.unit" disabled />
              </div>
              <div class="field">
                <label class="field-label">יחידת מידה משנית</label>
                <input class="input" :value="form.unit2 || '—'" disabled />
              </div>
              <div class="field">
                <label class="field-label">סוג משאב</label>
                <select v-model="form.resourceTypeId" class="select">
                  <option :value="null">בחר סוג משאב</option>
                  <option v-for="rt in db.resourceTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">זיהוי משאב</label>
                <select v-model="form.resourceId" class="select" :disabled="!form.resourceTypeId" title="נעול בשלב יצירת כתב הכמויות, פעיל בשלב תמחור">
                  <option :value="null">בחר זיהוי משאב</option>
                  <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.name }}</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">עדיפות</label>
                <select v-model="form.priority" class="select">
                  <option value="mandatory">חובה</option>
                  <option value="recommended">מומלץ</option>
                  <option value="optional">לא חובה</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">פחת</label>
                <input v-model="form.amortization" type="number" step="0.01" min="0" class="input num" placeholder="0.00" />
              </div>
              <div class="field span-2">
                <label class="field-label">תגית</label>
                <input class="input" :value="form.tags.join(', ') || '—'" disabled title="ניהול תגיות אינו זמין בדמו" />
              </div>
            </div>
            <h3 class="desc-heading">תיאור סעיף</h3>
            <div class="desc-box">
              <div class="desc-toolbar" title="עורך טקסט עשיר — לא זמין בדמו">
                <span class="dt-btn">B</span><span class="dt-btn">I</span><span class="dt-btn">U</span><span class="dt-btn">S</span>
              </div>
              <textarea v-model="form.description" class="desc-input scroll-slim" placeholder="כתוב תיאור סעיף" />
            </div>
          </template>

          <!-- הערות -->
          <template v-else-if="activeTab === 'notes'">
            <div class="note-editor">
              <textarea v-model="noteDraft" class="input note-input" rows="2" placeholder="כתוב הערה..." />
              <button class="btn btn-primary btn-sm" @click="addNote">הוספת הערה</button>
            </div>
            <div class="notes-stack scroll-slim">
              <div v-for="n in notes" :key="n.id" class="note-card">
                <div class="note-meta">
                  <span class="note-author">{{ n.author }}</span>
                  <span class="num">{{ new Date(n.ts).toLocaleDateString("he-IL") }}</span>
                </div>
                <p>{{ n.text }}</p>
              </div>
              <p v-if="!notes.length" class="p-empty">אין הערות לסעיף זה</p>
            </div>
          </template>

          <!-- סעיפים קשורים -->
          <template v-else-if="activeTab === 'related'">
            <div class="field">
              <label class="field-label">סעיף אב</label>
              <div class="parent-field">
                <input class="input" :value="parentItem ? `${parentItem.code} · ${parentItem.name}` : ''" placeholder="לא הוגדר סעיף אב" disabled />
                <button class="btn-text" disabled title="בחירת סעיף אב תתאפשר בגרסה הבאה">בחירה</button>
              </div>
            </div>
            <div class="field">
              <label class="field-label">סעיפים בנים (להצגה בלבד)</label>
              <div v-if="childItems.length" class="children-list">
                <div v-for="c in childItems" :key="c.id" class="child-row">
                  <span class="item-code">{{ c.code }}</span>
                  <span class="ellipsis">{{ c.name }}</span>
                </div>
              </div>
              <p v-else class="p-empty">אין סעיפים בנים</p>
            </div>
          </template>

          <!-- סעיפים חלופיים -->
          <template v-else>
            <div v-if="alternatives.length" class="children-list">
              <div v-for="a in alternatives" :key="a.id" class="child-row">
                <span class="item-code">{{ a.code }}</span>
                <span class="ellipsis">{{ a.name }}</span>
                <PriorityControl variant="squares" :model-value="a.priority || 'recommended'" />
              </div>
            </div>
            <p v-else class="p-empty">לא הוגדרו סעיפים חלופיים בקטלוג</p>
            <button class="btn-text" disabled title="עריכת חלופות מהקטלוג — לא זמין בדמו">הוספה</button>
          </template>
        </div>

        <!-- sticky footer -->
        <div class="iem-footer">
          <div class="f-start">
            <button class="btn btn-primary" @click="save">אישור</button>
            <button class="btn btn-secondary" @click="emit('close')">ביטול</button>
          </div>
          <button class="btn-danger-text" @click="deleteFromBoq">
            <AppIcon name="trash" :size="16" />
            <span>מחיקת סעיף</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.iem-overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 44, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 65;
}
.iem {
  width: 800px;
  max-width: 95vw;
  max-height: 92vh;
  background: var(--surface);
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  padding: 8px 0 0;
}
.iem-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  padding: 8px 32px;
}
.iem-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--brand-primary);
  text-align: right;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  display: inline-flex;
}
.iem-tabs {
  display: flex;
  padding: 0 32px;
  border-bottom: 1.5px solid var(--divider);
}
.iem-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1.5px;
  padding: 8px 18px;
  font-size: 14px;
  color: var(--text-secondary);
  font-family: inherit;
}
.iem-tab.active {
  color: var(--brand-primary);
  border-bottom-color: var(--brand-primary);
  font-weight: 500;
}
.iem-body {
  padding: 20px 32px;
  overflow-y: auto;
  flex: 1;
  text-align: right;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 20px;
}
.span-2 {
  grid-column: span 2;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
  text-align: right;
}
.desc-heading {
  font-size: 16px;
  font-weight: 700;
  margin: 18px 0 8px;
}
.desc-box {
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  overflow: hidden;
}
.desc-toolbar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--divider);
  padding: 6px 10px;
  color: var(--text-disabled);
}
.dt-btn {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  border-radius: 4px;
}
.desc-input {
  width: 100%;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13px;
  min-height: 140px;
  resize: vertical;
  text-align: right;
}
.note-editor {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.note-input {
  height: auto;
  padding: 8px 10px;
}
.btn-sm {
  height: 32px;
  min-width: 90px;
  font-size: 12px;
  padding: 0 14px;
}
.notes-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}
.note-card {
  background: var(--surface-muted);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
}
.note-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 3px;
}
.p-empty {
  color: var(--text-muted);
  font-size: 13px;
  padding: 8px 0;
}
.parent-field {
  display: flex;
  gap: 8px;
  align-items: center;
}
.children-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
}
.child-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--divider);
}
.child-row:last-child {
  border-bottom: none;
}
.iem-footer {
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
