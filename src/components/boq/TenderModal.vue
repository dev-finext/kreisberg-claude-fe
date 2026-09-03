<script setup>
import { ref, computed, watch } from "vue";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";
import { useEscape } from "@/composables/useEscape";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import SearchPill from "@/components/shared/SearchPill.vue";

const props = defineProps({
  boqId: { type: Number, required: true },
});
const emit = defineEmits(["close", "sent"]);
useEscape(() => emit("close"));

const db = useDbStore();
const ui = useUiStore();

/* --- configuration (כתב כמויות) --- */
const sourceHeader = computed(() => db.boqHeaders.find((h) => h.id === props.boqId) || null);
const headerOptions = computed(() =>
  sourceHeader.value ? db.boqHeaders.filter((h) => h.projectId === sourceHeader.value.projectId) : []
);
const selectedHeaderId = ref(props.boqId);
const selectedHeader = computed(() => db.boqHeaders.find((h) => h.id === selectedHeaderId.value) || null);

/* --- role (תפקיד) --- */
const defaultRole = db.resourceTypes.find((t) => t.name === "קבלן ראשי") || db.resourceTypes[0] || null;
const roleTypeId = ref(defaultRole ? defaultRole.id : null);

/* --- contractors --- */
const search = ref("");
const checkedIds = ref([]);
const roleConstructors = computed(() => db.constructors.filter((c) => c.typeId === roleTypeId.value));
const visibleConstructors = computed(() => {
  const t = search.value.trim();
  return roleConstructors.value.filter((c) => !t || c.name.includes(t));
});
watch(roleTypeId, () => {
  checkedIds.value = [];
  showAdd.value = false;
  newName.value = "";
});
function toggleContractor(id, v) {
  if (v && !checkedIds.value.includes(id)) checkedIds.value.push(id);
  if (!v) checkedIds.value = checkedIds.value.filter((x) => x !== id);
}

/* --- inline "הוספת בעל תפקיד" --- */
const showAdd = ref(false);
const newName = ref("");
function addConstructor() {
  const name = newName.value.trim();
  if (!name || !roleTypeId.value) return;
  const c = { id: db.nextId("constructors"), name, typeId: roleTypeId.value };
  db.db.constructors.push(c);
  db.persist();
  checkedIds.value.push(c.id);
  ui.toast(`בעל התפקיד "${name}" נוסף`);
  newName.value = "";
  showAdd.value = false;
}

/* --- date + message --- */
const dueDate = ref("");
const dateInput = ref(null);
const message = ref("");
function openDatePicker() {
  try {
    dateInput.value?.showPicker();
  } catch {
    dateInput.value?.focus();
  }
}

/* --- send --- */
const canSend = computed(() => checkedIds.value.length > 0 && !!dueDate.value);
function send() {
  if (!canSend.value || !selectedHeader.value) return;
  const n = checkedIds.value.length;
  const tender = {
    id: db.nextId("tenders"),
    boqId: selectedHeaderId.value,
    roleTypeId: roleTypeId.value,
    contractorIds: [...checkedIds.value],
    dueDate: dueDate.value,
    message: message.value,
    sentAt: new Date().toISOString(),
  };
  db.db.tenders.push(tender);

  const header = db.db.boqHeaders.find((h) => h.id === selectedHeaderId.value);
  if (header) {
    const pill = (header.stagePills || (header.stagePills = [])).find((p) => p.label === "מכרז");
    if (pill) {
      pill.count = n;
      pill.kind = "info";
    } else {
      header.stagePills.unshift({ label: "מכרז", count: n, kind: "info" });
    }
    const d = new Date();
    header.exitDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    header.sla = { late: 0, near: 0, ok: n };
  }
  db.persist();
  ui.toast(`המכרז נשלח ל-${n} בעלי תפקיד`);
  emit("sent", tender);
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div class="tender-overlay" @mousedown.self="emit('close')">
      <div class="tender-modal">
        <!-- header -->
        <div class="tm-header">
          <button class="tm-close" @click="emit('close')">
            <AppIcon name="cancel" :size="20" />
          </button>
          <h2 class="tm-title">יציאה למכרז</h2>
        </div>
        <div class="tm-divider" />

        <!-- body -->
        <div class="tm-body scroll-slim">
          <!-- boq + description -->
          <div class="top-grid">
            <div class="field">
              <label class="field-label">כתב כמויות</label>
              <select v-model="selectedHeaderId" class="select">
                <option v-for="h in headerOptions" :key="h.id" :value="h.id">{{ h.name }}</option>
              </select>
            </div>
            <div class="field desc-field">
              <label class="field-label">תיאור</label>
              <div class="desc-text scroll-slim">{{ selectedHeader?.detail || "—" }}</div>
            </div>
            <div class="field">
              <label class="field-label">תפקיד</label>
              <select v-model="roleTypeId" class="select">
                <option v-for="rt in db.resourceTypes" :key="rt.id" :value="rt.id">
                  {{ rt.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- assign section head -->
          <div class="assign-head">
            <span class="assign-title"
              >שיוך בעלי תפקיד למכרז (<span class="num">{{ checkedIds.length }}</span> נבחרו)</span
            >
            <div class="assign-tools">
              <button class="add-link" @click="showAdd = !showAdd">
                <span class="plus-disc"><AppIcon name="plus" :size="12" /></span>
                <span>הוספת בעל תפקיד</span>
              </button>
              <span class="tools-divider" />
              <SearchPill v-model="search" placeholder="חיפוש" width="214px" />
            </div>
          </div>

          <!-- inline add row -->
          <div v-if="showAdd" class="add-row">
            <input
              v-model="newName"
              class="input add-input"
              placeholder="שם בעל התפקיד"
              @keyup.enter="addConstructor"
            />
            <button class="btn btn-primary add-btn" :disabled="!newName.trim()" @click="addConstructor">
              הוספה
            </button>
            <button
              class="btn-text"
              @click="
                showAdd = false;
                newName = '';
              "
            >
              ביטול
            </button>
          </div>

          <!-- contractors list -->
          <div class="list-card scroll-slim">
            <div v-if="visibleConstructors.length" class="list-grid">
              <label
                v-for="c in visibleConstructors"
                :key="c.id"
                class="list-row"
                @click.prevent="toggleContractor(c.id, !checkedIds.includes(c.id))"
              >
                <BaseCheckbox
                  :model-value="checkedIds.includes(c.id)"
                  @update:model-value="(v) => toggleContractor(c.id, v)"
                />
                <span class="list-name ellipsis">{{ c.name }}</span>
              </label>
            </div>
            <p v-else class="list-empty">לא נמצאו בעלי תפקיד מסוג זה</p>
          </div>

          <!-- due date -->
          <div class="field date-field">
            <label class="field-label">תאריך אחרון למענה על המכרז</label>
            <div class="date-wrap" @click="openDatePicker">
              <svg
                class="cal-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                <path d="M3.5 9.5h17M8 3v4M16 3v4" />
              </svg>
              <input ref="dateInput" v-model="dueDate" type="date" class="date-input num" @click.stop />
            </div>
          </div>

          <!-- message -->
          <div class="field">
            <label class="field-label">הודעה</label>
            <textarea
              v-model="message"
              class="input msg-area"
              maxlength="250"
              placeholder="כאן ניתן לכתוב הודעה לבעלי התפקיד שבחרת"
            />
            <div class="msg-count num">{{ message.length }}/250</div>
          </div>
        </div>

        <!-- footer -->
        <div class="tm-footer">
          <button class="btn btn-primary" :disabled="!canSend" @click="send">הבא</button>
          <button class="btn btn-secondary" @click="emit('close')">ביטול</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tender-overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 44, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 65;
}
.tender-modal {
  width: 720px;
  max-width: 94vw;
  max-height: 92vh;
  background: var(--surface);
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  padding: 8px 0 24px;
}
.tm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  padding: 8px 32px;
}
.tm-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
}
.tm-close {
  background: none;
  border: none;
  color: var(--text-primary);
  display: inline-flex;
  padding: 2px;
}
.tm-divider {
  height: 1.5px;
  background: var(--divider);
}
.tm-body {
  padding: 20px 32px 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
  text-align: right;
}
/* top: boq select (right) + description (left) + role */
.top-grid {
  display: grid;
  grid-template-columns: 242px 1fr;
  gap: 16px 24px;
  margin-bottom: 20px;
}
.desc-field {
  grid-row: 1 / span 2;
  grid-column: 2;
  min-width: 0;
}
.desc-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  text-align: right;
  max-height: 96px;
  overflow-y: auto;
}
/* assign section */
.assign-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.assign-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.assign-tools {
  display: flex;
  align-items: center;
  gap: 14px;
}
.add-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 13px;
  font-weight: 600;
}
.plus-disc {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tools-divider {
  width: 1px;
  height: 24px;
  background: var(--border-strong);
}
/* inline add */
.add-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.add-input {
  width: 280px;
  height: 36px;
  font-size: 13px;
}
.add-btn {
  height: 36px;
  min-width: 84px;
}
/* contractors list */
.list-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-card);
  padding: 12px 16px;
  max-height: 256px;
  min-height: 120px;
  overflow-y: auto;
  margin-bottom: 20px;
}
.list-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 40px;
}
.list-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 33px;
  cursor: pointer;
  min-width: 0;
}
.list-name {
  font-size: 13px;
  color: var(--text-primary);
}
.list-empty {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 36px 0;
}
/* due date */
.date-field {
  width: 242px;
  margin-bottom: 20px;
}
.date-wrap {
  display: flex;
  align-items: center;
  height: var(--input-h);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  padding: 0 12px;
  background: var(--surface);
  cursor: pointer;
}
.date-wrap:focus-within {
  border-color: var(--brand-primary);
}
.cal-icon {
  color: var(--text-primary);
  flex-shrink: 0;
  order: 2; /* leftmost in RTL row */
}
.date-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
  order: 1;
}
.date-input::-webkit-calendar-picker-indicator {
  display: none;
}
/* message */
.msg-area {
  height: 84px;
  padding: 10px 12px;
  resize: none;
  line-height: 1.5;
}
.msg-count {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: left;
  margin-top: 4px;
}
/* footer: primary at far left per Figma */
.tm-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row-reverse;
  justify-content: flex-start;
  padding: 16px 32px 0;
}
</style>
