<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import PageHeader from "@/components/layout/PageHeader.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const router = useRouter();
const db = useDbStore();
const search = ref("");

const projects = computed(() => {
  const t = search.value.trim();
  return db.projects.filter((p) => !t || p.name.includes(t) || (p.location || "").includes(t));
});

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}
</script>

<template>
  <div>
    <PageHeader title="פרויקטים" :crumbs="['שם-לקוח', 'מחלקה', 'תת מחלקה']">
      <template #actions>
        <button class="btn btn-primary" @click="router.push('/projects/new')">פרויקט חדש</button>
      </template>
    </PageHeader>

    <div class="card">
      <div class="card-toolbar">
        <h2 class="card-title">פרויקטים</h2>
        <div class="search-pill">
          <input v-model="search" placeholder="חיפוש" />
          <AppIcon name="search" :size="20" />
        </div>
      </div>
      <table class="projects-table">
        <thead>
          <tr>
            <th>שם הפרויקט</th>
            <th>כתובת</th>
            <th>סוג הפרויקט</th>
            <th>כותב/ת</th>
            <th>תאריך יצירה</th>
            <th>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in projects" :key="p.id" class="project-row" @click="router.push(`/projects/${p.id}/quantities`)">
            <td class="p-name">{{ p.name }}</td>
            <td>{{ p.location }}</td>
            <td>{{ p.typeName }}</td>
            <td>{{ p.author }}</td>
            <td class="num">{{ fmtDate(p.createdAt) }}</td>
            <td>
              <div class="pills">
                <span v-for="pill in p.statusPills" :key="pill.label" class="pill" :class="'pill-' + pill.kind">
                  {{ pill.label }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: 20px 24px;
  min-height: calc(100vh - 130px);
}
.card-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.search-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row-reverse;
  background: var(--surface-muted);
  border-radius: var(--radius-pill);
  height: 40px;
  padding: 0 16px;
  width: 226px;
  color: var(--text-disabled);
}
.search-pill input {
  border: none;
  background: none;
  outline: none;
  flex: 1;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.search-pill input::placeholder {
  color: var(--text-disabled);
}
.projects-table {
  width: 100%;
  border-collapse: collapse;
}
.projects-table th {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
  padding: 10px 14px;
  border-bottom: 1px solid var(--divider);
}
.projects-table td {
  font-size: 13px;
  color: var(--text-primary);
  text-align: right;
  padding: 10px 14px;
  border-bottom: 1px solid var(--divider);
  height: 44px;
}
.project-row {
  cursor: pointer;
}
.project-row:hover {
  background: var(--surface-subtle);
}
.p-name {
  font-weight: 500;
}
.pills {
  display: flex;
  gap: 6px;
}
</style>
