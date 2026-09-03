<script setup>
import EntityCrudView from "@/components/system/EntityCrudView.vue";

const columns = [{ key: "name", label: "שם התבנית", editor: "text" }];
</script>

<template>
  <EntityCrudView
    title="תבניות פרויקטים"
    add-label="הוספת תבנית"
    empty-text="עדיין אין תבניות פרויקטים"
    collection="projectTemplates"
    :columns="columns"
    :make-new="() => ({ name: '' })"
  />
</template>
