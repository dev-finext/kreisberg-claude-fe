<script setup>
import { ref, computed, reactive, nextTick } from "vue";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import BaseModal from "@/components/shared/BaseModal.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";
import SearchPill from "@/components/shared/SearchPill.vue";
import FilterRow from "@/components/shared/FilterRow.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const props = defineProps({
  project: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const db = useDbStore();
const ui = useUiStore();

const search = ref("");
const checked = ref([]);
const attached = computed(() => new Set(props.project.contactIds || []));

/* ---------------- filters ----------------
   Read off the contacts themselves, so no filter offers a value that comes back empty. */
const filters = ref({});
const cityOf = (c) => (c.address || "").split(",").pop().trim();
const uniq = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
const resourceTypeName = (id) => db.resourceTypes.find((t) => t.id === id)?.name || "";
const filterDefs = computed(() => {
  const all = db.contacts;
  const opt = (v) => ({ value: v, label: v });
  return [
    { key: "role", label: "תפקיד", options: uniq(all.map((c) => c.role)).map(opt) },
    {
      key: "resourceTypeId",
      label: "סיווג",
      options: db.resourceTypes
        .filter((t) => all.some((c) => c.resourceTypeId === t.id))
        .map((t) => ({ value: String(t.id), label: t.name })),
    },
    { key: "business", label: "שם העסק", options: uniq(all.map((c) => c.business)).map(opt) },
    { key: "city", label: "יישוב", options: uniq(all.map(cityOf)).map(opt) },
    {
      key: "state",
      label: "שיוך לפרויקט",
      options: [
        { value: "free", label: "לא מצורפים" },
        { value: "attached", label: "כבר מצורפים" },
      ],
    },
  ];
});
const FILTER_VALUE = {
  role: (c) => c.role,
  resourceTypeId: (c) => String(c.resourceTypeId),
  business: (c) => c.business,
  city: cityOf,
  state: (c) => (attached.value.has(c.id) ? "attached" : "free"),
};

const visible = computed(() => {
  const t = search.value.trim();
  return db.contacts.filter((c) => {
    if (
      t &&
      !`${c.firstName} ${c.lastName} ${c.role} ${c.phone} ${c.email} ${c.business} ${c.address}`.includes(t)
    )
      return false;
    for (const [key, sel] of Object.entries(filters.value)) {
      if (sel && sel.length && !sel.includes(FILTER_VALUE[key] && FILTER_VALUE[key](c))) return false;
    }
    return true;
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

/* ---------------- a new contact, inline as the table's first row ----------------
   Every field the contacts table shows, in the column it will sit in. Saving
   creates the contact and ticks it, so "הוספה" attaches it straight away. */
const ROLE_SUGGESTIONS = computed(() => uniq(db.contacts.map((c) => c.role)));
const creating = ref(false);
const firstInput = ref(null);
function blankContact() {
  return {
    firstName: "",
    lastName: "",
    role: "",
    phone: "",
    email: "",
    hp: "",
    address: "",
    constructorId: null,
    resourceTypeId: db.resourceTypes[0]?.id ?? null,
  };
}
const draft = reactive(blankContact());
function startCreate() {
  Object.assign(draft, blankContact());
  creating.value = true;
  nextTick(() => firstInput.value?.focus());
}
function cancelCreate() {
  creating.value = false;
}
/* picking the business brings its סיווג along, which can still be changed */
function onBusiness() {
  const r = db.constructors.find((c) => c.id === draft.constructorId);
  if (r) draft.resourceTypeId = r.typeId;
}
function saveCreate() {
  if (!draft.firstName.trim() || !draft.lastName.trim()) {
    ui.toast("נא להזין שם פרטי ושם משפחה", "warning");
    return;
  }
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    ui.toast('כתובת הדוא"ל אינה תקינה', "warning");
    return;
  }
  const business = db.constructors.find((c) => c.id === draft.constructorId);
  const c = {
    id: db.nextId("contacts"),
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    role: draft.role.trim(),
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    hp: draft.hp.trim(),
    address: draft.address.trim(),
    business: business?.name || "",
    resourceTypeId: draft.resourceTypeId,
    constructorId: business?.id ?? null,
  };
  db.db.contacts.push(c);
  db.persist();
  checked.value.push(c.id);
  creating.value = false;
  ui.toast("איש הקשר נוסף למאגר ומסומן לצירוף");
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
    title="צירוף אנשי קשר לפרויקט"
    width="80vw"
    :confirm-label="checked.length ? `הוספה (${checked.length})` : 'הוספה'"
    :confirm-disabled="!checked.length || creating"
    @close="emit('close')"
    @confirm="confirm"
  >
    <div class="tools">
      <button class="add-link" :disabled="creating" @click="startCreate">
        <span class="plus-disc"><AppIcon name="plus" :size="12" /></span>
        <span>איש קשר חדש</span>
      </button>
      <SearchPill v-model="search" placeholder="חיפוש לפי שם, טלפון, דוא״ל או עסק" width="320px" />
    </div>

    <FilterRow v-model="filters" :defs="filterDefs" @clear="search = ''" />

    <div class="table-wrap scroll-slim">
      <table class="contacts-table">
        <thead>
          <tr>
            <th class="th-check"><BaseCheckbox :model-value="allChecked" @update:model-value="setAll" /></th>
            <th>שם פרטי</th>
            <th>שם משפחה</th>
            <th>תפקיד</th>
            <th>טלפון</th>
            <th>דוא"ל</th>
            <th>ח.פ</th>
            <th>כתובת</th>
            <th>שם העסק</th>
            <th>סיווג</th>
          </tr>
        </thead>
        <tbody>
          <!-- the new contact, in the columns it will sit in -->
          <tr v-if="creating" class="new-row" @keydown.esc.stop="cancelCreate" @keyup.enter="saveCreate">
            <td class="td-check new-actions">
              <button class="round ok" title="שמירה" @click="saveCreate">
                <AppIcon name="check" :size="14" />
              </button>
              <button class="round" title="ביטול" @click="cancelCreate">
                <AppIcon name="cancel" :size="12" />
              </button>
            </td>
            <td>
              <input ref="firstInput" v-model="draft.firstName" class="cell-input" placeholder="שם פרטי *" />
            </td>
            <td><input v-model="draft.lastName" class="cell-input" placeholder="שם משפחה *" /></td>
            <td>
              <input v-model="draft.role" class="cell-input" list="contact-roles" placeholder="תפקיד" />
              <datalist id="contact-roles">
                <option v-for="r in ROLE_SUGGESTIONS" :key="r" :value="r" />
              </datalist>
            </td>
            <td><input v-model="draft.phone" class="cell-input num" placeholder="טלפון" /></td>
            <td><input v-model="draft.email" class="cell-input ltr" placeholder="mail@example.com" /></td>
            <td><input v-model="draft.hp" class="cell-input num" placeholder="ח.פ" /></td>
            <td><input v-model="draft.address" class="cell-input" placeholder="רחוב, עיר" /></td>
            <td>
              <select v-model="draft.constructorId" class="cell-input" @change="onBusiness">
                <option :value="null">ללא עסק</option>
                <option v-for="r in db.constructors" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </td>
            <td>
              <select v-model="draft.resourceTypeId" class="cell-input">
                <option v-for="t in db.resourceTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </td>
          </tr>

          <tr
            v-for="c in visible"
            :key="c.id"
            class="row"
            :class="{ attached: attached.has(c.id), checked: checked.includes(c.id) }"
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
            <td>{{ c.role || "—" }}</td>
            <td class="num">{{ c.phone || "—" }}</td>
            <td v-full-title class="ltr ellipsis td-mail">{{ c.email || "—" }}</td>
            <td class="num">{{ c.hp || "—" }}</td>
            <td v-full-title class="ellipsis td-address">{{ c.address || "—" }}</td>
            <td v-full-title class="ellipsis td-business">{{ c.business || "—" }}</td>
            <td>{{ resourceTypeName(c.resourceTypeId) || "—" }}</td>
          </tr>
          <tr v-if="!visible.length && !creating">
            <td colspan="10" class="empty">לא נמצאו אנשי קשר התואמים לחיפוש ולסינון</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="foot-note">
      אנשי קשר שכבר מצורפים לפרויקט מופיעים באפור. איש קשר חדש נשמר במאגר ומסומן לצירוף מיד.
    </p>
  </BaseModal>
</template>

<style scoped>
.tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  margin-bottom: 12px;
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
.add-link:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}
.plus-disc {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: currentColor;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.plus-disc :deep(svg) {
  color: #fff;
}
.table-wrap {
  max-height: calc(90vh - 330px);
  min-height: 220px;
  overflow: auto;
}
.contacts-table {
  width: 100%;
  border-collapse: collapse;
}
.contacts-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface);
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
  padding: 8px 12px;
  border-bottom: 1px solid var(--divider);
  height: 46px;
  white-space: nowrap;
}
.td-mail,
.td-address,
.td-business {
  max-width: 200px;
}
.ltr {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: right;
}
.row {
  cursor: pointer;
}
.row:hover {
  background: var(--surface-subtle);
}
.row.checked {
  background: var(--brand-primary-soft);
}
.row.attached {
  color: var(--text-muted);
  cursor: default;
}
/* ---- the inline new contact ---- */
.new-row td {
  background: var(--brand-primary-soft);
  padding: 6px 6px;
}
.new-actions {
  white-space: nowrap;
}
.round {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
}
.round.ok {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.cell-input {
  width: 100%;
  min-width: 90px;
  height: 32px;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  padding: 0 8px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--surface);
}
.cell-input:focus {
  outline: none;
  border-color: var(--brand-primary);
}
.empty {
  text-align: center;
  color: var(--text-muted);
  padding: 30px 0;
}
.foot-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
