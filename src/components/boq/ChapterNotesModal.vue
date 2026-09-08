<script setup>
import { ref, computed, nextTick } from "vue";
import { useBoqStore } from "@/stores/boq";
import { useUiStore } from "@/stores/ui";
import BaseModal from "@/components/shared/BaseModal.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import RichTextEditor from "@/components/shared/RichTextEditor.vue";
import { formatDateTime } from "@/utils/format";
import { sanitizeHtml, stripHtml } from "@/utils/html";

const props = defineProps({
  scope: { type: String, required: true }, // 'chapter' | 'subChapter'
  target: { type: Object, required: true }, // chapter or sub-chapter object
});
const emit = defineEmits(["close"]);

const boq = useBoqStore();
const ui = useUiStore();

const search = ref("");
const adding = ref(false); // editor card at the top for a new note
const editingId = ref(null); // note being edited in place
const draft = ref("");
const draftEl = ref(null);
const confirmDeleteId = ref(null);

const title = computed(() =>
  props.scope === "chapter"
    ? `הערות לפרק ${props.target.num} - ${props.target.name}`
    : `הערות לתת פרק ${props.target.num} - ${props.target.name}`
);
const notes = computed(() =>
  boq
    .commentsFor(props.scope, props.target.id)
    .filter((n) => !search.value.trim() || stripHtml(n.text).includes(search.value.trim()))
);
/* one editor card, rendered either on top (new note) or in place of the note being edited */
const rows = computed(() => {
  const out = adding.value ? [{ key: "new", editor: true }] : [];
  for (const n of notes.value) {
    out.push(editingId.value === n.id ? { key: n.id, editor: true, note: n } : { key: n.id, note: n });
  }
  return out;
});

function focusDraft() {
  const el = Array.isArray(draftEl.value) ? draftEl.value[0] : draftEl.value;
  el?.$el?.querySelector(".rte-body")?.focus();
}

async function startAdd() {
  editingId.value = null;
  draft.value = "";
  adding.value = true;
  await nextTick();
  focusDraft();
}
async function startEdit(n) {
  adding.value = false;
  editingId.value = n.id;
  draft.value = n.text;
  await nextTick();
  focusDraft();
}
function cancelEdit() {
  adding.value = false;
  editingId.value = null;
  draft.value = "";
}
function commitEdit() {
  const text = draft.value.trim();
  if (!stripHtml(text)) {
    ui.toast("נא לכתוב הערה לפני השמירה", "warning");
    return;
  }
  if (editingId.value) {
    boq.updateComment(editingId.value, text);
    ui.toast("ההערה עודכנה");
  } else {
    boq.addComment(props.scope, props.target.id, text);
    ui.toast("ההערה נוספה בהצלחה");
  }
  cancelEdit();
}
function removeNote(id) {
  boq.deleteComment(id);
  confirmDeleteId.value = null;
  ui.toast("ההערה נמחקה");
}
</script>

<template>
  <BaseModal
    :title="title"
    width="822px"
    confirm-label="שמירה"
    @close="emit('close')"
    @confirm="emit('close')"
  >
    <!-- Figma: הוספת הערה on the right, search pill on the left -->
    <div class="notes-head">
      <button class="add-btn" :disabled="adding" @click="startAdd">
        <span>הוספת הערה</span>
        <AppIcon name="plus-circle" :size="24" />
      </button>
      <div class="search-pill">
        <input v-model="search" placeholder="חיפוש בהערות" />
        <AppIcon name="search" :size="24" />
      </div>
    </div>

    <div class="notes-stack scroll-slim">
      <template v-for="r in rows" :key="r.key">
        <!-- rich-text editor card (Figma "rich text": toolbar strip, text, ✓ / ✕) -->
        <div v-if="r.editor" class="editor-card" @keydown.esc="cancelEdit">
          <div class="editor-row">
            <RichTextEditor
              ref="draftEl"
              v-model="draft"
              class="draft"
              placeholder="כתוב הערה..."
              min-height="72px"
            />
            <div class="editor-actions">
              <button class="act" title="אישור" @click="commitEdit">
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                  <circle cx="12" cy="12" r="12" fill="#5b93ef" />
                  <path
                    d="M7 12.5l3 3 7-7"
                    fill="none"
                    stroke="#fff"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button class="act" title="ביטול" @click="cancelEdit">
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" fill="none" stroke="#bbc5cf" stroke-width="1.5" />
                  <path
                    d="M8.5 8.5l7 7M15.5 8.5l-7 7"
                    stroke="#70869e"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- note card: text, with edit / delete revealed on hover (Figma "Note") -->
        <div v-else class="note-card" :title="`${r.note.author} · ${formatDateTime(r.note.ts)}`">
          <p class="note-text" v-html="sanitizeHtml(r.note.text)"></p>
          <div class="note-actions">
            <button class="icon-btn" title="עריכה" @click="startEdit(r.note)">
              <AppIcon name="pencil" :size="24" />
            </button>
            <button class="icon-btn" title="מחיקה" @click="confirmDeleteId = r.note.id">
              <AppIcon name="trash" :size="24" />
            </button>
          </div>
          <!-- Figma "למחוק את הערה?" popover -->
          <div v-if="confirmDeleteId === r.note.id" class="confirm-pop" @click.stop>
            <p>למחוק את הערה?</p>
            <div class="confirm-actions">
              <button class="mini-btn primary" @click="removeNote(r.note.id)">מחיקה</button>
              <button class="mini-btn" @click="confirmDeleteId = null">ביטול</button>
            </div>
          </div>
        </div>
      </template>
      <p v-if="!rows.length" class="empty">אין הערות עדיין</p>
    </div>
  </BaseModal>
</template>

<style scoped>
.notes-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  margin-bottom: 16px;
}
.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 40px;
  padding: 0 8px;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
}
.add-btn:disabled {
  color: var(--text-disabled);
  cursor: default;
}
.search-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row-reverse;
  background: var(--surface-muted);
  border-radius: var(--radius-pill);
  height: 40px;
  padding: 0 16px;
  width: 224px;
  color: var(--text-disabled);
}
.search-pill input {
  border: none;
  background: none;
  outline: none;
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: inherit;
}
.search-pill input::placeholder {
  color: var(--text-disabled);
}
.notes-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 531px;
  overflow-y: auto;
  padding: 2px 0;
}
/* note card: white with a gray hairline; hover lifts it onto the selected-blue and reveals actions */
.note-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  min-height: 68px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 16px 24px;
}
.note-card:hover {
  background: var(--brand-primary-soft);
  box-shadow: 0 2px 3px rgba(16, 37, 86, 0.08);
}
.note-text {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 18px;
  color: var(--text-primary);
  text-align: right;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.note-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
}
.note-card:hover .note-actions {
  opacity: 1;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  display: inline-flex;
  padding: 0;
}
/* editor card */
.editor-card {
  background: var(--surface);
  border-radius: 6px;
}
.editor-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.draft {
  flex: 1;
  min-width: 0;
}
.editor-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
}
.act {
  background: none;
  border: none;
  padding: 0;
  display: inline-flex;
  line-height: 0;
}
/* delete confirmation popover */
.confirm-pop {
  position: absolute;
  left: 16px;
  top: calc(100% - 8px);
  z-index: 5;
  width: 200px;
  background: var(--surface);
  border-radius: 6px;
  box-shadow: 2px 2px 6px rgba(11, 27, 54, 0.2);
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}
.confirm-pop p {
  font-size: 14px;
  line-height: 18px;
  color: var(--text-primary);
  text-align: center;
}
.confirm-actions {
  display: flex;
  gap: 8px;
}
.mini-btn {
  height: 24px;
  padding: 0 24px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--brand-primary);
  color: var(--brand-primary);
  background: var(--surface);
}
.mini-btn.primary {
  background: var(--brand-primary);
  color: #fff;
}
.empty {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}
</style>
