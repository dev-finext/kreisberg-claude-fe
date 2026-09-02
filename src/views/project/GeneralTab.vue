<script setup>
import { reactive, ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";

const route = useRoute();
const db = useDbStore();
const ui = useUiStore();

const project = computed(() => db.projects.find((p) => p.id === Number(route.params.id)) || null);

const form = reactive({
  name: project.value?.name || "",
  location: project.value?.location || "",
  typeName: project.value?.typeName || "",
  template: "",
  description: project.value?.description || "",
  specialName: "",
  specialValue: "",
});

const assets = ref(
  project.value ? [{ id: 1, name: "נכס ראשי", block: "6638", parcel: "112", subParcel: "4" }] : []
);
let assetSeq = 2;
const editingAsset = ref(null);

function addAsset() {
  const a = { id: assetSeq++, name: "", block: "", parcel: "", subParcel: "" };
  assets.value.push(a);
  editingAsset.value = a.id;
}
function saveAsset() {
  editingAsset.value = null;
  ui.toast("הנכס נשמר");
}
function removeAsset(a) {
  assets.value = assets.value.filter((x) => x.id !== a.id);
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
          <input v-model="form.name" class="input" />
        </div>
        <div class="field">
          <label class="field-label">כתובת פרויקט</label>
          <input v-model="form.location" class="input" />
        </div>
        <div class="field">
          <label class="field-label">סוג פרויקט</label>
          <select v-model="form.typeName" class="select">
            <option value="">בחר סוג</option>
            <option>שיפוץ דירה</option>
            <option>בנייה פרטית</option>
            <option>תמ"א 38</option>
            <option>בניין</option>
            <option>מסחר</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">תבניות פרויקט</label>
          <select v-model="form.template" class="select" disabled title="לא זמין בדמו">
            <option value="">בחר תבנית</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label class="field-label">תיאור חופשי</label>
        <textarea v-model="form.description" class="input textarea" rows="3" />
      </div>

      <h3 class="section-title mt">מדיה</h3>
      <div class="grid-2">
        <div class="field">
          <label class="field-label">הוספת תמונת רקע</label>
          <div class="upload" title="העלאת קבצים אינה זמינה בדמו">
            <AppIcon name="plus" :size="14" />
            <span>טען או גרור תמונה / קובץ מדיה</span>
          </div>
        </div>
        <div class="field">
          <label class="field-label">הוספת לוגו</label>
          <div class="upload" title="העלאת קבצים אינה זמינה בדמו">
            <AppIcon name="plus" :size="14" />
            <span>טען או גרור תמונה / קובץ מדיה</span>
          </div>
        </div>
      </div>

      <div class="special-head">
        <button class="ghost-btn">
          <span>הוספת שדה מיוחד</span>
          <AppIcon name="plus-circle" :size="18" />
        </button>
        <h3 class="section-title inline">
          שדות מיוחדים
          <AppIcon name="info" :size="15" />
        </h3>
      </div>
      <div class="grid-2">
        <div class="field">
          <label class="field-label">שם שדה מיוחד</label>
          <input v-model="form.specialName" class="input" placeholder="נתוני שדה מיוחד" />
        </div>
        <div class="field">
          <label class="field-label">שם שדה מיוחד</label>
          <input v-model="form.specialValue" class="input" placeholder="נתוני שדה מיוחד" />
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
          <tbody v-if="assets.length">
            <tr v-for="a in assets" :key="a.id">
              <template v-if="editingAsset === a.id">
                <td><input v-model="a.name" class="input asset-input" placeholder="שם הנכס" /></td>
                <td><input v-model="a.block" class="input asset-input num" /></td>
                <td><input v-model="a.parcel" class="input asset-input num" /></td>
                <td><input v-model="a.subParcel" class="input asset-input num" /></td>
                <td class="td-act">
                  <button class="btn-text" @click="saveAsset">שמירה</button>
                </td>
              </template>
              <template v-else>
                <td>{{ a.name || "—" }}</td>
                <td class="num">{{ a.block || "—" }}</td>
                <td class="num">{{ a.parcel || "—" }}</td>
                <td class="num">{{ a.subParcel || "—" }}</td>
                <td class="td-act">
                  <button class="icon-btn" @click="editingAsset = a.id"><AppIcon name="pencil" :size="15" /></button>
                  <button class="icon-btn danger" @click="removeAsset(a)"><AppIcon name="trash" :size="15" /></button>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
        <div v-if="!assets.length" class="assets-empty">
          <svg width="110" height="96" viewBox="0 0 110 96" fill="none">
            <ellipse cx="55" cy="86" rx="40" ry="6" fill="#EEF2FA" />
            <rect x="30" y="14" width="34" height="70" rx="3" stroke="#BBC5CF" stroke-width="2.2" fill="#fff" />
            <rect x="64" y="38" width="20" height="46" rx="3" stroke="#BBC5CF" stroke-width="2.2" fill="#fff" />
            <path d="M36 24h6M46 24h6M36 34h6M46 34h6M36 44h6M46 44h6M36 54h6M46 54h6M69 46h4M77 46h4M69 56h4M77 56h4M69 66h4M77 66h4" stroke="#BBC5CF" stroke-width="2" stroke-linecap="round" />
          </svg>
          <p>הנכסים שתוסיף יופיעו כאן</p>
        </div>
      </div>
    </section>
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
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
  text-align: right;
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
  cursor: not-allowed;
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
