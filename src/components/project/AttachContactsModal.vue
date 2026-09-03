<script setup>
import { ref, computed, reactive } from "vue";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import BaseModal from "@/components/shared/BaseModal.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import SearchPill from "@/components/shared/SearchPill.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const props = defineProps({
  project: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const db = useDbStore();
const ui = useUiStore();

const ROLES = ['מנכ"ל', "מנהל זוטר", "עובד"];

const search = ref("");
const checked = ref([]);
const roleFilterOpen = ref(false);
const roleFilterDraft = ref([]); // pending selection inside the dropdown
const roleFilter = ref([]); // applied
const showNew = ref(false);
const newContact = reactive({ firstName: "", lastName: "", role: ROLES[2], business: "" });

const attached = computed(() => new Set(props.project.contactIds || []));

const visible = computed(() => {
  const t = search.value.trim();
  return db.contacts.filter((c) => {
    if (roleFilter.value.length && !roleFilter.value.includes(c.role)) return false;
    if (!t) return true;
    return `${c.firstName} ${c.lastName} ${c.business}`.includes(t);
  });
});

const allChecked = computed(() => {
  const free = visible.value.filter((c) => !attached.value.has(c.id));
  return free.length > 0 && free.every((c) => checked.value.includes(c.id));
});
function setAll(v) {
  const free = visible.value.filter((c) => !attached.value.has(c.id)).map((c) => c.id);
  checked.value = v
    ? [...new Set([...checked.value, ...free])]
    : checked.value.filter((id) => !free.includes(id));
}
function toggle(c, v) {
  if (attached.value.has(c.id)) return;
  if (v && !checked.value.includes(c.id)) checked.value.push(c.id);
  if (!v) checked.value = checked.value.filter((id) => id !== c.id);
}
function resourceTypeName(c) {
  return db.resourceTypes.find((t) => t.id === c.resourceTypeId)?.name || "---";
}

/* role column filter */
function openRoleFilter() {
  roleFilterDraft.value = [...roleFilter.value];
  roleFilterOpen.value = true;
}
function toggleRoleDraft(role, v) {
  if (v && !roleFilterDraft.value.includes(role)) roleFilterDraft.value.push(role);
  if (!v) roleFilterDraft.value = roleFilterDraft.value.filter((r) => r !== role);
}
function applyRoleFilter() {
  roleFilter.value = [...roleFilterDraft.value];
  roleFilterOpen.value = false;
}

/* inline new contact */
function saveNew() {
  if (!newContact.firstName.trim() || !newContact.lastName.trim()) {
    ui.toast("נא להזין שם פרטי ושם משפחה", "warning");
    return;
  }
  const c = {
    id: db.nextId("contacts"),
    firstName: newContact.firstName.trim(),
    lastName: newContact.lastName.trim(),
    role: newContact.role,
    phone: "",
    email: "",
    hp: "",
    address: "",
    business: newContact.business.trim(),
    resourceTypeId: 1,
    constructorId: null,
  };
  db.db.contacts.push(c);
  db.persist();
  checked.value.push(c.id);
  Object.assign(newContact, { firstName: "", lastName: "", role: ROLES[2], business: "" });
  showNew.value = false;
  ui.toast("איש הקשר נוסף למאגר");
}

function confirm() {
  if (!checked.value.length) return;
  const p = db.db.projects.find((x) => x.id === props.project.id);
  p.contactIds = [...new Set([...(p.contactIds || []), ...checked.value])];
  db.persist();
  ui.toast(`${checked.value.length} אנשי קשר צורפו לפרויקט`);
  emit("close");
}
</script>

<template>
  <BaseModal
    title="אנשי קשר"
    width="815px"
    confirm-label="הוספה"
    :confirm-disabled="!checked.length"
    @close="emit('close')"
    @confirm="confirm"
  >
    <div class="tools">
      <button class="add-link" @click="showNew = !showNew">
        <span class="plus-disc"><AppIcon name="plus" :size="12" /></span>
        <span>איש קשר חדש</span>
      </button>
      <SearchPill v-model="search" placeholder="חיפוש" />
    </div>

    <div v-if="showNew" class="new-row">
      <input v-model="newContact.firstName" class="input sm" placeholder="שם פרטי" />
      <input v-model="newContact.lastName" class="input sm" placeholder="שם משפחה" />
      <select v-model="newContact.role" class="select sm">
        <option v-for="r in ROLES" :key="r">{{ r }}</option>
      </select>
      <input v-model="newContact.business" class="input sm" placeholder="שם העסק" />
      <button class="btn btn-primary sm-btn" @click="saveNew">שמירה</button>
    </div>

    <div class="table-wrap scroll-slim">
      <table class="contacts-table">
        <thead>
          <tr>
            <th class="th-check"><BaseCheckbox :model-value="allChecked" @update:model-value="setAll" /></th>
            <th>שם פרטי <AppIcon name="chevron-down" :size="12" /></th>
            <th>שם משפחה <AppIcon name="chevron-down" :size="12" /></th>
            <th class="th-role">
              <button class="th-btn" :class="{ active: roleFilter.length }" @click="openRoleFilter">
                תפקיד <AppIcon name="chevron-down" :size="12" />
              </button>
              <div v-if="roleFilterOpen" class="role-menu">
                <label class="rm-row">
                  <BaseCheckbox
                    size="small"
                    :model-value="!roleFilterDraft.length"
                    @update:model-value="roleFilterDraft = []"
                  />
                  <span>הכל</span>
                </label>
                <label v-for="r in ROLES" :key="r" class="rm-row">
                  <BaseCheckbox
                    size="small"
                    :model-value="roleFilterDraft.includes(r)"
                    @update:model-value="(v) => toggleRoleDraft(r, v)"
                  />
                  <span>{{ r }}</span>
                </label>
                <div class="rm-actions">
                  <button class="btn btn-primary rm-ok" @click="applyRoleFilter">אישור</button>
                  <button class="btn-text" @click="roleFilterOpen = false">ביטול</button>
                </div>
              </div>
            </th>
            <th>שם העסק <AppIcon name="chevron-down" :size="12" /></th>
            <th>סיווג <AppIcon name="chevron-down" :size="12" /></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in visible"
            :key="c.id"
            class="row"
            :class="{ attached: attached.has(c.id) }"
            @click="toggle(c, !checked.includes(c.id))"
          >
            <td class="td-check" @click.stop>
              <BaseCheckbox
                :model-value="attached.has(c.id) || checked.includes(c.id)"
                :disabled="attached.has(c.id)"
                @update:model-value="(v) => toggle(c, v)"
              />
            </td>
            <td>{{ c.firstName }}</td>
            <td>{{ c.lastName }}</td>
            <td>{{ c.role }}</td>
            <td class="ellipsis">{{ c.business }}</td>
            <td>{{ resourceTypeName(c) }}</td>
          </tr>
          <tr v-if="!visible.length">
            <td colspan="6" class="empty">לא נמצאו אנשי קשר</td>
          </tr>
        </tbody>
      </table>
    </div>
  </BaseModal>
</template>

<style scoped>
.tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  margin-bottom: 18px;
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
.new-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.sm {
  height: 34px;
  font-size: 13px;
}
.sm-btn {
  height: 34px;
  min-width: 80px;
  padding: 0 14px;
  font-size: 13px;
}
.table-wrap {
  max-height: 360px;
  overflow-y: auto;
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
  position: relative;
}
.th-btn {
  background: none;
  border: none;
  font: inherit;
  color: inherit;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
}
.th-btn.active {
  color: var(--brand-primary);
}
.role-menu {
  position: absolute;
  top: 100%;
  right: -10px;
  z-index: 20;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-menu);
  padding: 10px 12px;
  width: 200px;
  text-align: right;
}
.rm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 400;
  padding: 6px 0;
  cursor: pointer;
}
.rm-row:first-child {
  border-bottom: 1px solid var(--divider);
  margin-bottom: 4px;
}
.rm-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  flex-direction: row-reverse;
  justify-content: flex-start;
}
.rm-ok {
  height: 30px;
  min-width: 72px;
  padding: 0 14px;
  font-size: 12px;
}
.contacts-table td {
  font-size: 13px;
  text-align: right;
  padding: 10px 12px;
  border-bottom: 1px solid var(--divider);
  height: 48px;
}
.row {
  cursor: pointer;
}
.row:hover {
  background: var(--surface-subtle);
}
.row.attached {
  color: var(--text-muted);
  cursor: default;
}
.empty {
  text-align: center;
  color: var(--text-muted);
  padding: 30px 0;
}
</style>
