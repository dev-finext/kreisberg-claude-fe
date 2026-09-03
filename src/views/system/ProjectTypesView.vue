<script setup>
import EntityCrudView from "@/components/system/EntityCrudView.vue";

const columns = [{ key: "name", label: "שם הקטגוריה", editor: "text" }];
</script>

<template>
  <EntityCrudView
    title="קטגוריות פרויקט"
    add-label="הוספת קטגוריה"
    empty-text="עדיין אין קטגוריות פרויקט"
    collection="projectTypes"
    :columns="columns"
    :make-new="() => ({ name: '' })"
  />
</template>
