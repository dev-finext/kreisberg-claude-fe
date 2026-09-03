<script setup>
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import { useProjectFormStore } from "@/stores/projectForm";
import AppIcon from "@/components/shared/AppIcon.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";

const route = useRoute();
const db = useDbStore();
const ui = useUiStore();
const form = useProjectFormStore();

const project = computed(() =>
  route.params.id === "new" ? null : db.projects.find((p) => p.id === Number(route.params.id)) || null
);

watch(project, (p) => form.loadProject(p), { immediate: true });

const draft = computed(() => form.draft);

/* ---------- assets (פרטי הנכס) ---------- */
let assetSeq = -1;
const editingAsset = ref(null);
const deleteAsset = ref(null);

function addAsset() {
  const a = { id: assetSeq--, name: "", block: "", parcel: "", subParcel: "" };
  draft.value.assets.push(a);
  editingAsset.value = a.id;
}
function saveAsset(a) {
  if (!a.name.trim()) {
    ui.toast("נא להזין שם נכס", "warning");
    return;
  }
  editingAsset.value = null;
}
function confirmDeleteAsset() {
  draft.value.assets = draft.value.assets.filter((x) => x.id !== deleteAsset.value.id);
  deleteAsset.value = null;
}

/* ---------- special fields ---------- */
function addSpecialField() {
  draft.value.specialFields.push({ name: "", value: "" });
}
</script>

<template>
  <div class="general-tab">
    <!-- right column: project details -->
    <section class="col details">
      <h3 class="section-title">פרטי הפרויקט</h3>
      <div class="grid-2">
        <div class="field">
          <label class="field-label">שם הפרויקט</label>
          <input v-model="draft.name" class="input" />
        </div>
        <div class="field">
          <label class="field-label">כתובת פרויקט</label>
          <input v-model="draft.location" class="input" />
        </div>
        <div class="field">
          <label class="field-label">סוג פרויקט</label>
          <select v-model="draft.typeId" class="select">
            <option :value="null">בחר סוג</option>
            <option v-for="t in db.projectTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">תבניות פרויקט</label>
          <select v-model="draft.templateId" class="select">
            <option :value="null">בחר תבנית</option>
            <option v-for="t in db.projectTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label class="field-label">תיאור חופשי</label>
        <textarea v-model="draft.description" class="input textarea" rows="3" />
      </div>

      <h3 class="section-title mt">מדיה</h3>
      <div class="grid-2">
        <div class="field">
          <label class="field-label">הוספת תמונת רקע</label>
          <label class="upload">
            <input type="file" accept="image/*" hidden @change="ui.toast('התמונה נשמרה לפרויקט')" />
            <AppIcon name="plus" :size="14" />
            <span>טען או גרור תמונה / קובץ מדיה</span>
          </label>
        </div>
        <div class="field">
          <label class="field-label">הוספת לוגו</label>
          <label class="upload">
            <input type="file" accept="image/*" hidden @change="ui.toast('הלוגו נשמר לפרויקט')" />
            <AppIcon name="plus" :size="14" />
            <span>טען או גרור תמונה / קובץ מדיה</span>
          </label>
        </div>
      </div>

      <div class="special-head">
        <button class="ghost-btn" @click="addSpecialField">
          <span>הוספת שדה מיוחד</span>
          <AppIcon name="plus-circle" :size="18" />
        </button>
        <h3 class="section-title inline">
          שדות מיוחדים
          <AppIcon name="info" :size="15" />
        </h3>
      </div>
      <div v-for="(sf, i) in draft.specialFields" :key="i" class="grid-2">
        <div class="field">
          <label class="field-label">שם שדה מיוחד</label>
          <input v-model="sf.name" class="input" placeholder="נתוני שדה מיוחד" />
        </div>
        <div class="field">
          <label class="field-label">ערך</label>
          <input v-model="sf.value" class="input" placeholder="נתוני שדה מיוחד" />
        </div>
      </div>
    </section>

    <div class="col-divider" />

    <!-- left column: assets -->
    <section class="col assets">
      <div class="assets-head">
        <button class="ghost-btn filled" @click="addAsset">
          <span>הוספת נכס חדש</span>
          <span class="plus-disc"><AppIcon name="plus" :size="12" /></span>
        </button>
        <h3 class="section-title">פרטי הנכס</h3>
      </div>
      <div class="assets-card">
        <table class="assets-table">
          <thead>
            <tr>
              <th>שם הנכס <AppIcon name="chevron-down" :size="12" /></th>
              <th>גוש <AppIcon name="chevron-down" :size="12" /></th>
              <th>חלקה <AppIcon name="chevron-down" :size="12" /></th>
              <th>תת חלקה <AppIcon name="chevron-down" :size="12" /></th>
              <th></th>
            </tr>
          </thead>
          <tbody v-if="draft.assets.length">
            <tr v-for="a in draft.assets" :key="a.id">
              <template v-if="editingAsset === a.id">
                <td><input v-model="a.name" class="input asset-input" placeholder="שם הנכס" /></td>
                <td><input v-model="a.block" class="input asset-input num" /></td>
                <td><input v-model="a.parcel" class="input asset-input num" /></td>
                <td><input v-model="a.subParcel" class="input asset-input num" /></td>
                <td class="td-act">
                  <button class="btn-text" @click="saveAsset(a)">שמירה</button>
                </td>
              </template>
              <template v-else>
                <td>{{ a.name || "—" }}</td>
                <td class="num">{{ a.block || "—" }}</td>
                <td class="num">{{ a.parcel || "—" }}</td>
                <td class="num">{{ a.subParcel || "—" }}</td>
                <td class="td-act">
                  <button class="icon-btn" @click="editingAsset = a.id">
                    <AppIcon name="pencil" :size="15" />
                  </button>
                  <button class="icon-btn danger" @click="deleteAsset = a">
                    <AppIcon name="trash" :size="15" />
                  </button>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
        <div v-if="!draft.assets.length" class="assets-empty">
          <svg width="110" height="96" viewBox="0 0 110 96" fill="none">
            <ellipse cx="55" cy="86" rx="40" ry="6" fill="#EEF2FA" />
            <rect
              x="30"
              y="14"
              width="34"
              height="70"
              rx="3"
              stroke="#BBC5CF"
              stroke-width="2.2"
              fill="#fff"
            />
            <rect
              x="64"
              y="38"
              width="20"
              height="46"
              rx="3"
              stroke="#BBC5CF"
              stroke-width="2.2"
              fill="#fff"
            />
            <path
              d="M36 24h6M46 24h6M36 34h6M46 34h6M36 44h6M46 44h6M36 54h6M46 54h6M69 46h4M77 46h4M69 56h4M77 56h4M69 66h4M77 66h4"
              stroke="#BBC5CF"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <p>הנכסים שתוסיף יופיעו כאן</p>
        </div>
      </div>
    </section>

    <DeleteConfirmModal
      v-if="deleteAsset"
      title="הסרת נכס"
      :message="`האם אתה בטוח שברצונך להסיר את &quot;${deleteAsset.name || 'הנכס'}&quot;?`"
      confirm-label="הסרה"
      @close="deleteAsset = null"
      @confirm="confirmDeleteAsset"
    />
  </div>
</template>

<style scoped>
.general-tab {
  display: flex;
  flex-direction: row;
  gap: 24px;
  padding: 24px;
}
.col {
  flex: 1;
  min-width: 0;
}
.col-divider {
  width: 2px;
  background: var(--divider);
  border-radius: 1px;
}
.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 14px;
  text-align: right;
}
.section-title.mt {
  margin-top: 22px;
}
.section-title.inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-direction: row-reverse;
  margin-bottom: 0;
  color: var(--text-primary);
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}
.field {
  margin-bottom: 12px;
}
.textarea {
  height: auto;
  padding: 10px 12px;
  resize: vertical;
}
.upload {
  border: 1.5px dashed var(--border-strong);
  border-radius: 8px;
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-direction: row-reverse;
  color: var(--brand-primary);
  font-size: 13px;
  cursor: pointer;
}
.special-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 22px 0 12px;
}
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-direction: row-reverse;
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
}
.assets-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.assets-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 16px 16px;
  min-height: 260px;
  box-shadow: var(--shadow-card);
}
.assets-table {
  width: 100%;
  border-collapse: collapse;
}
.assets-table th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border-strong);
  white-space: nowrap;
}
.assets-table td {
  font-size: 13px;
  text-align: right;
  padding: 8px;
  border-bottom: 1px solid var(--divider);
}
.asset-input {
  height: 32px;
  font-size: 13px;
}
.td-act {
  white-space: nowrap;
  width: 80px;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 3px;
}
.icon-btn.danger {
  color: var(--danger);
}
.assets-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 210px;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
