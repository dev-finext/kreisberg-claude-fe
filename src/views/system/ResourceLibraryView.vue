<script setup>
import { computed } from "vue";
import { useDbStore } from "@/stores/db";
import EntityCrudView from "@/components/system/EntityCrudView.vue";

const db = useDbStore();

/* a resource carries the same details as any contact in the system, so the
   library is not a name and a type with everything else living elsewhere */
const columns = computed(() => [
  { key: "name", label: "שם המשאב", editor: "text" },
  {
    key: "typeId",
    label: "סוג משאב",
    editor: "select",
    options: db.resourceTypes.map((t) => ({ value: t.id, label: t.name })),
  },
  { key: "contactName", label: "איש קשר", editor: "text" },
  { key: "phone", label: "טלפון", editor: "text", align: "num" },
  { key: "email", label: 'דוא"ל', editor: "text", align: "ltr" },
  { key: "hp", label: "ח.פ / ע.מ", editor: "text", align: "num" },
  { key: "address", label: "כתובת", editor: "text" },
]);
</script>

<template>
  <EntityCrudView
    title="ספריית משאבים"
    add-label="הוספת משאב"
    empty-text="עדיין אין משאבים בספרייה"
    collection="constructors"
    table-width="none"
    :columns="columns"
    :make-new="
      () => ({
        name: '',
        typeId: db.resourceTypes[0]?.id ?? null,
        contactName: '',
        phone: '',
        email: '',
        hp: '',
        address: '',
      })
    "
  />
</template>
