<script setup>
import AppIcon from "@/components/shared/AppIcon.vue";

defineProps({
  title: { type: String, required: true },
  /** breadcrumb items, rightmost first; last one (current) rendered bold */
  crumbs: { type: Array, default: () => ["שם-לקוח", "מחלקה", "תת מחלקה", "פרויקטים"] },
});
</script>

<template>
  <header class="page-header">
    <div class="crumbs">
      <template v-for="(c, i) in crumbs" :key="i">
        <span class="crumb">{{ c }}</span>
        <span class="crumb-sep"><AppIcon name="chevron-left" :size="14" /></span>
      </template>
      <span class="crumb crumb-current">{{ title }}</span>
    </div>
    <div class="title-row">
      <h1 class="page-title">{{ title }}</h1>
      <div class="actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.crumbs {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 12px;
  color: var(--text-primary);
  min-height: 16px;
}
.crumb-sep {
  display: inline-flex;
  color: var(--text-primary);
  margin: 0 1px;
}
.crumb-current {
  font-weight: 700;
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  min-height: 40px;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: right;
}
.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
