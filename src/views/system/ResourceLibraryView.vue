<script setup>
import { computed } from "vue";
import { useDbStore } from "@/stores/db";
import EntityCrudView from "@/components/system/EntityCrudView.vue";

const db = useDbStore();
const columns = computed(() => [
  { key: "name", label: "שם המשאב", editor: "text" },
  {
    key: "typeId",
    label: "סוג משאב",
    editor: "select",
    options: db.resourceTypes.map((t) => ({ value: t.id, label: t.name })),
  },
]);
</script>

<template>
  <EntityCrudView
    title="ספריית משאבים"
    add-label="הוספת משאב"
    empty-text="עדיין אין משאבים בספרייה"
    collection="constructors"
    :columns="columns"
    :make-new="() => ({ name: '', typeId: db.resourceTypes[0]?.id ?? null })"
  />
</template>
