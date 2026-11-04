<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";
import AttachContactsModal from "@/components/project/AttachContactsModal.vue";
import FilterRow from "@/components/shared/FilterRow.vue";
import SearchPill from "@/components/shared/SearchPill.vue";

const route = useRoute();
const db = useDbStore();
const ui = useUiStore();

const project = computed(() => db.projects.find((p) => p.id === Number(route.params.id)) || null);
const attached = computed(() => {
  const ids = project.value?.contactIds || [];
  return ids.map((id) => db.contacts.find((c) => c.id === id)).filter(Boolean);
});

/* ---------------- filters ----------------
   The options are read off the contacts actually attached to this project, so
   no filter offers a value that would come back empty. */
const search = ref("");
const filters = ref({});
const cityOf = (c) => (c.address || "").split(",").pop().trim();
const uniq = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
const filterDefs = computed(() => {
  const all = attached.value;
  const opt = (v) => ({ value: v, label: v });
  return [
    { key: "role", label: "מקצוע", options: uniq(all.map((c) => c.role)).map(opt) },
    {
      key: "resourceTypeId",
      label: "סוג משאב",
      options: db.resourceTypes
        .filter((t) => all.some((c) => c.resourceTypeId === t.id))
        .map((t) => ({ value: String(t.id), label: t.name })),
    },
    { key: "business", label: "משאב", options: uniq(all.map((c) => c.business)).map(opt) },
    { key: "city", label: "יישוב", options: uniq(all.map(cityOf)).map(opt) },
  ];
});
const FILTER_VALUE = {
  role: (c) => c.role,
  resourceTypeId: (c) => String(c.resourceTypeId),
  business: (c) => c.business,
  city: cityOf,
};
const contacts = computed(() => {
  const t = search.value.trim();
  return attached.value.filter((c) => {
    if (t && !`${c.firstName} ${c.lastName} ${c.role} ${c.phone} ${c.email} ${c.business}`.includes(t))
      return false;
    for (const [key, sel] of Object.entries(filters.value)) {
      if (sel && sel.length && !sel.includes(FILTER_VALUE[key] && FILTER_VALUE[key](c))) return false;
    }
    return true;
  });
});

const checked = ref([]);
const showAttach = ref(false);
const removeTarget = ref(null); // single contact or 'checked'

const allChecked = computed(
  () => contacts.value.length > 0 && contacts.value.every((c) => checked.value.includes(c.id))
);
function setAll(v) {
  checked.value = v ? contacts.value.map((c) => c.id) : [];
}
function toggle(id, v) {
  if (v && !checked.value.includes(id)) checked.value.push(id);
  if (!v) checked.value = checked.value.filter((x) => x !== id);
}

function removeIds(ids) {
  const p = db.db.projects.find((x) => x.id === project.value.id);
  p.contactIds = (p.contactIds || []).filter((id) => !ids.includes(id));
  checked.value = checked.value.filter((id) => !ids.includes(id));
  db.persist();
  ui.toast(
    ids.length === 1
      ? "איש הקשר הוסר מהפרויקט. הוא עדיין קיים במאגר אנשי הקשר שלך"
      : `${ids.length} אנשי קשר הוסרו מהפרויקט. הם עדיין קיימים במאגר אנשי הקשר שלך`
  );
}
function confirmRemove() {
  const ids = removeTarget.value === "checked" ? [...checked.value] : [removeTarget.value.id];
  removeTarget.value = null;
  removeIds(ids);
}
const removeMessage = computed(() =>
  removeTarget.value === "checked"
    ? `האם להסיר ${checked.value.length} אנשי קשר מהפרויקט?`
    : `האם להסיר את ${removeTarget.value?.firstName} ${removeTarget.value?.lastName} מהפרויקט?`
);
</script>

<template>
  <div class="resources-tab">
    <div class="head">
      <button class="add-link" @click="showAttach = true">
        <span class="plus-disc"><AppIcon name="plus" :size="12" /></span>
        <span>צרף איש קשר</span>
      </button>
      <h3 class="title">
        אנשי קשר מצורפים לפרויקט
        <span class="count">({{ contacts.length }} מתוך {{ attached.length }})</span>
      </h3>
    </div>

    <FilterRow v-model="filters" :defs="filterDefs" @clear="search = ''">
      <template #actions>
        <SearchPill v-model="search" placeholder="חיפוש איש קשר" width="240px" />
      </template>
    </FilterRow>

    <table class="contacts-table">
      <thead>
        <tr>
          <th class="th-check"><BaseCheckbox :model-value="allChecked" @update:model-value="setAll" /></th>
          <th>שם פרטי <AppIcon name="chevron-down" :size="12" /></th>
          <th>שם משפחה <AppIcon name="chevron-down" :size="12" /></th>
          <th>תפקיד <AppIcon name="chevron-down" :size="12" /></th>
          <th>טלפון <AppIcon name="chevron-down" :size="12" /></th>
          <th>דוא"ל <AppIcon name="chevron-down" :size="12" /></th>
          <th>ח.פ <AppIcon name="chevron-down" :size="12" /></th>
          <th>כתובת <AppIcon name="chevron-down" :size="12" /></th>
          <th class="th-trash">
            <button
              class="icon-btn"
              :disabled="!checked.length"
              title="הסרת אנשי הקשר המסומנים"
              @click="removeTarget = 'checked'"
            >
              <AppIcon name="trash" :size="18" />
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in contacts" :key="c.id" class="row" :class="{ checked: checked.includes(c.id) }">
          <td class="td-check">
            <BaseCheckbox
              :model-value="checked.includes(c.id)"
              @update:model-value="(v) => toggle(c.id, v)"
            />
          </td>
          <td>{{ c.firstName }}</td>
          <td>{{ c.lastName }}</td>
          <td>{{ c.role }}</td>
          <td class="num">{{ c.phone || "---" }}</td>
          <td class="ltr">{{ c.email || "---" }}</td>
          <td class="num">{{ c.hp || "---" }}</td>
          <td>{{ c.address || "---" }}</td>
          <td class="td-trash">
            <button class="remove-btn" @click="removeTarget = c">
              <span class="remove-lbl">הסר</span>
              <AppIcon name="trash" :size="18" />
            </button>
          </td>
        </tr>
        <tr v-if="!contacts.length">
          <td colspan="9">
            <div v-if="attached.length" class="empty">
              <p class="empty-title">אין אנשי קשר התואמים לסינון</p>
              <p class="empty-sub">נקה את הסינון כדי לראות את כל אנשי הקשר של הפרויקט</p>
            </div>
            <div v-else class="empty">
              <p class="empty-title">עדיין אין אנשי קשר מצורפים</p>
              <p class="empty-sub">צרף אנשי קשר מהמאגר כדי לשייך אותם לפרויקט</p>
              <button class="btn btn-primary" @click="showAttach = true">צרף איש קשר</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <AttachContactsModal v-if="showAttach && project" :project="project" @close="showAttach = false" />
    <DeleteConfirmModal
      v-if="removeTarget"
      title="הסרת איש קשר"
      :message="removeMessage"
      detail="איש הקשר יישאר במאגר אנשי הקשר של הארגון"
      confirm-label="הסרה"
      @close="removeTarget = null"
      @confirm="confirmRemove"
    />
  </div>
</template>

<style scoped>
.resources-tab {
  padding: 24px 24px 24px 40px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  margin-bottom: 22px;
}
.count {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
}
.title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
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
}
.contacts-table {
  width: 100%;
  border-collapse: collapse;
}
.contacts-table th {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-strong);
  white-space: nowrap;
}
.contacts-table td {
  font-size: 13px;
  text-align: right;
  padding: 10px 12px;
  border-bottom: 1px solid var(--divider);
  height: 48px;
}
.row:hover {
  background: var(--surface-subtle);
}
.row.checked {
  background: var(--brand-primary-soft);
}
.ltr {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: right;
}
.th-trash,
.td-trash {
  width: 90px;
  text-align: left;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--brand-primary);
  display: inline-flex;
  padding: 2px;
}
.icon-btn:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}
.remove-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-direction: row-reverse;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 13px;
}
.remove-lbl {
  opacity: 0;
  color: var(--text-secondary);
  transition: opacity 0.12s ease;
}
.row:hover .remove-lbl {
  opacity: 1;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 50px 0;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
}
.empty-sub {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
</style>
