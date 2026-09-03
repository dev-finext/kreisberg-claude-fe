<script setup>
import EntityCrudView from "@/components/system/EntityCrudView.vue";

const columns = [{ key: "name", label: "שם סוג המשאב", editor: "text" }];
</script>

<template>
  <EntityCrudView
    title="סוגי משאבים"
    add-label="הוספת סוג משאב"
    empty-text="עדיין אין סוגי משאבים"
    collection="resourceTypes"
    :columns="columns"
    :make-new="() => ({ name: '' })"
  />
</template>
