<script setup>
import { reactive, computed } from "vue";
import { useRoute } from "vue-router";
import { useDbStore } from "@/stores/db";
import AppIcon from "@/components/shared/AppIcon.vue";

const route = useRoute();
const db = useDbStore();

const project = computed(() => db.projects.find((p) => p.id === Number(route.params.id)) || null);

const form = reactive({
  name: project.value?.name || "",
  location: project.value?.location || "",
  typeName: project.value?.typeName || "",
  description: project.value?.description || "",
});

const assets = reactive(
  project.value
    ? [{ id: 1, name: "נכס ראשי", block: "6638", parcel: "112", subParcel: "4" }]
    : []
);
</script>

<template>
  <div class="general-tab">
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
      </div>
      <div class="field">
        <label class="field-label">סוג פרויקט</label>
        <select v-model="form.typeName" class="select">
          <option value="">בחר סוג</option>
          <option>שיפוץ דירה</option>
          <option>בנייה פרטית</option>
          <option>תמ"א 38</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">תיאור חופשי</label>
        <textarea v-model="form.description" class="input textarea" rows="4" />
      </div>
      <h3 class="section-title">מדיה</h3>
      <div class="grid-2">
        <div class="field">
          <label class="field-label">הוספת לוגו</label>
          <div class="upload disabled" title="לא זמין בדמו">טען או גרור תמונה / קובץ מדיה</div>
        </div>
        <div class="field">
          <label class="field-label">הוספת תמונת רקע</label>
          <div class="upload disabled" title="לא זמין בדמו">טען או גרור תמונה / קובץ מדיה</div>
        </div>
      </div>
    </section>

    <section class="col assets">
      <div class="assets-head">
        <h3 class="section-title">פרטי הנכס</h3>
        <button class="ghost-btn">
          <span>הוספת נכס חדש</span>
          <AppIcon name="plus-circle" :size="20" />
        </button>
      </div>
      <div class="assets-card">
        <table v-if="assets.length" class="assets-table">
          <thead>
            <tr>
              <th>שם הנכס</th>
              <th>גוש</th>
              <th>חלקה</th>
              <th>תת חלקה</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in assets" :key="a.id">
              <td>{{ a.name }}</td>
              <td class="num">{{ a.block }}</td>
              <td class="num">{{ a.parcel }}</td>
              <td class="num">{{ a.subParcel }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="assets-empty">הנכסים שתוסיף יופיעו כאן</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.general-tab {
  display: flex;
  flex-direction: row;
  gap: 40px;
  padding: 24px;
}
.col {
  flex: 1;
  min-width: 0;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
  text-align: right;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.field {
  margin-bottom: 16px;
}
.textarea {
  height: auto;
  padding: 10px 12px;
  resize: vertical;
}
.upload {
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-disabled);
  font-size: 13px;
}
.upload.disabled {
  background: var(--surface-muted);
  cursor: not-allowed;
}
.assets-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  margin-bottom: 12px;
}
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-direction: row-reverse;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 13px;
  font-weight: 600;
}
.assets-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  min-height: 220px;
}
.assets-table {
  width: 100%;
  border-collapse: collapse;
}
.assets-table th,
.assets-table td {
  font-size: 13px;
  text-align: right;
  padding: 8px 10px;
  border-bottom: 1px solid var(--divider);
}
.assets-table th {
  color: var(--text-secondary);
  font-weight: 500;
}
.assets-empty {
  color: var(--text-muted);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
</style>
