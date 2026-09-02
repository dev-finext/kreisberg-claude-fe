<script setup>
import { ref, computed } from "vue";
import { useBoqStore } from "@/stores/boq";
import { useUiStore } from "@/stores/ui";
import BaseModal from "@/components/shared/BaseModal.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const props = defineProps({
  scope: { type: String, required: true }, // 'chapter' | 'subChapter'
  target: { type: Object, required: true }, // chapter or sub-chapter object
});
const emit = defineEmits(["close"]);

const boq = useBoqStore();
const ui = useUiStore();

const search = ref("");
const adding = ref(false);
const draft = ref("");

const title = computed(() =>
  props.scope === "chapter"
    ? `הערות לפרק ${props.target.num} - ${props.target.name}`
    : `הערות לתת פרק ${props.target.num} - ${props.target.name}`
);
const notes = computed(() =>
  boq.commentsFor(props.scope, props.target.id).filter((n) => !search.value.trim() || n.text.includes(search.value.trim()))
);

function saveDraft() {
  if (!draft.value.trim()) {
    ui.toast("נא לכתוב הערה לפני השמירה", "warning");
    return;
  }
  boq.addComment(props.scope, props.target.id, draft.value.trim());
  draft.value = "";
  adding.value = false;
  ui.toast("ההערה נוספה בהצלחה");
}

function fmtTs(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("he-IL") + " " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}
</script>

<template>
  <BaseModal :title="title" width="640px" confirm-label="שמירה" @close="emit('close')" @confirm="emit('close')">
    <div class="notes-head">
      <button class="btn-text add-btn" @click="adding = !adding">
        <AppIcon name="plus-circle" :size="18" />
        <span>הוספת הערה</span>
      </button>
      <div class="search-pill">
        <input v-model="search" placeholder="חיפוש בהערות" />
        <AppIcon name="search" :size="18" />
      </div>
    </div>

    <div v-if="adding" class="edit-card">
      <div class="rt-toolbar" title="עורך טקסט עשיר — לא זמין בדמו">
        <span class="dt">B</span><span class="dt">I</span><span class="dt">U</span>
      </div>
      <textarea v-model="draft" class="input draft" rows="3" placeholder="כתוב הערה..." />
      <div class="edit-actions">
        <button class="round-btn confirm" @click="saveDraft"><AppIcon name="check" :size="16" /></button>
        <button class="round-btn" @click="adding = false; draft = ''"><AppIcon name="cancel" :size="14" /></button>
      </div>
    </div>

    <div class="notes-stack scroll-slim">
      <div v-for="n in notes" :key="n.id" class="note-card">
        <div class="note-meta">
          <span class="author">{{ n.author }}</span>
          <span class="num">{{ fmtTs(n.ts) }}</span>
        </div>
        <p class="note-text">{{ n.text }}</p>
      </div>
      <p v-if="!notes.length" class="empty">אין הערות עדיין</p>
    </div>
  </BaseModal>
</template>

<style scoped>
.notes-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  margin-bottom: 14px;
}
.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-direction: row-reverse;
  font-weight: 600;
}
.search-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row-reverse;
  background: var(--surface-muted);
  border-radius: var(--radius-pill);
  height: 36px;
  padding: 0 14px;
  width: 220px;
  color: var(--text-muted);
}
.search-pill input {
  border: none;
  background: none;
  outline: none;
  flex: 1;
  text-align: right;
  font-size: 12px;
}
.edit-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px 10px;
  margin-bottom: 12px;
}
.rt-toolbar {
  display: flex;
  gap: 4px;
  color: var(--text-disabled);
  margin-bottom: 6px;
}
.dt {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
.draft {
  height: auto;
  border: none;
  padding: 0;
  resize: vertical;
}
.draft:focus {
  border: none;
}
.edit-actions {
  position: absolute;
  left: -14px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.round-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.round-btn.confirm {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.notes-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
}
.note-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  text-align: right;
}
.note-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.author {
  font-weight: 600;
}
.note-text {
  font-size: 13px;
  white-space: pre-line;
}
.empty {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}
</style>
