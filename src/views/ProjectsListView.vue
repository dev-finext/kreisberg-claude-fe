<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import PageHeader from "@/components/layout/PageHeader.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import SearchPill from "@/components/shared/SearchPill.vue";
import SlaDonut from "@/components/boq/SlaDonut.vue";
import { formatDate } from "@/utils/format";

const router = useRouter();
const db = useDbStore();
const search = ref("");

const projects = computed(() => {
  const t = search.value.trim();
  return db.projects.filter((p) => !t || p.name.includes(t) || (p.location || "").includes(t));
});

/* ---- tiles data ---- */
const typeColors = {
  "שיפוץ דירה": "var(--status-purple)",
  "בנייה פרטית": "var(--graph-blue-light)",
  'תמ"א 38': "var(--graph-blue-dark)",
  אחר: "var(--status-pink)",
};
const typeCounts = computed(() => {
  const m = new Map();
  for (const p of db.projects) m.set(p.typeName, (m.get(p.typeName) || 0) + 1);
  return [...m.entries()].map(([name, count]) => ({
    name,
    count,
    color: typeColors[name] || "var(--status-gray)",
  }));
});
const totalProjects = computed(() => db.projects.length);
const slaAgg = computed(() => {
  const agg = { late: 0, near: 0, ok: 0 };
  for (const h of db.boqHeaders) {
    agg.late += h.sla.late;
    agg.near += h.sla.near;
    agg.ok += h.sla.ok;
  }
  return agg;
});
const statusSteps = computed(() => [
  {
    label: "חדש",
    count: db.boqHeaders.filter((h) => h.status === "draft" && !h.stagePills.length).length,
    cls: "st-new",
  },
  { label: "כתב כמויות", count: db.boqHeaders.length, cls: "st-boq" },
  {
    label: "מכרז",
    count: db.boqHeaders.filter((h) => h.stagePills.some((p) => p.label === "מכרז")).length,
    cls: "st-tender",
  },
  {
    label: "תומחר",
    count: db.boqHeaders.filter((h) => h.stagePills.some((p) => p.label === "תומחר")).length,
    cls: "st-priced",
  },
  { label: "חוזה", count: 0, cls: "st-contract" },
]);

/* donut for project types */
const R = 40;
const C = 2 * Math.PI * R;
const typeSegments = computed(() => {
  const total = totalProjects.value || 1;
  let offset = 0;
  return typeCounts.value.map((t) => {
    const len = (t.count / total) * C;
    const seg = { ...t, dasharray: `${len - 2} ${C - len + 2}`, dashoffset: -offset };
    offset += len;
    return seg;
  });
});

function projectStatus(p) {
  return p.statusPills.length ? p.statusPills[p.statusPills.length - 1].label : "חדש";
}
</script>

<template>
  <div>
    <PageHeader title="דשבורד" :crumbs="['שם-לקוח', 'מחלקה', 'תת מחלקה', 'פרויקטים']">
      <template #actions>
        <button class="btn btn-primary new-project" @click="router.push('/projects/new')">
          <AppIcon name="plus" :size="16" />
          <span>פרויקט חדש</span>
        </button>
      </template>
    </PageHeader>

    <div class="card">
      <!-- summary tiles -->
      <div class="tiles">
        <div class="tile">
          <h3 class="tile-title">סוגי פרויקטים</h3>
          <div class="tile-body types">
            <div class="donut-wrap">
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" :r="R" fill="none" stroke="var(--divider)" stroke-width="9" />
                <circle
                  v-for="s in typeSegments"
                  :key="s.name"
                  cx="48"
                  cy="48"
                  :r="R"
                  fill="none"
                  :stroke="s.color"
                  stroke-width="9"
                  stroke-linecap="round"
                  :stroke-dasharray="s.dasharray"
                  :stroke-dashoffset="s.dashoffset"
                  transform="rotate(-90 48 48)"
                />
                <text
                  x="48"
                  y="57"
                  text-anchor="middle"
                  font-size="26"
                  font-weight="700"
                  fill="var(--text-primary)"
                >
                  {{ totalProjects }}
                </text>
              </svg>
            </div>
            <div class="type-legend">
              <div v-for="t in typeCounts" :key="t.name" class="tl-row">
                <span class="tl-count num">{{ t.count }}</span>
                <span class="tl-name">{{ t.name }}</span>
                <span class="tl-dot" :style="{ background: t.color }" />
              </div>
            </div>
          </div>
        </div>

        <div class="tile">
          <h3 class="tile-title">שליחת תמחור SLA</h3>
          <div class="tile-body sla-big">
            <SlaDonut :sla="slaAgg" class="sla-scaled" />
          </div>
        </div>

        <div class="tile">
          <h3 class="tile-title">עדכונים</h3>
          <div class="tile-body updates">
            <svg width="90" height="64" viewBox="0 0 90 64" fill="none">
              <ellipse cx="45" cy="54" rx="34" ry="6" fill="#EEF2FA" />
              <path
                d="M14 34L74 12l-18 34-12-10-8 14-4-16z"
                stroke="#BBC5CF"
                stroke-width="2"
                fill="#fff"
                stroke-linejoin="round"
              />
              <path d="M74 12L44 36" stroke="#BBC5CF" stroke-width="2" />
              <path
                d="M8 16c3-2 6 1 4 4M80 40c-3 2-6-1-4-4"
                stroke="#DCE3EF"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
            <p class="updates-empty">אין עדכונים חדשים</p>
          </div>
        </div>

        <div class="tile">
          <h3 class="tile-title">סטטוס</h3>
          <div class="tile-body statuses">
            <div class="stepper">
              <template v-for="(s, i) in statusSteps" :key="s.label">
                <div class="step">
                  <span class="step-dot" />
                  <span class="step-count num">{{ s.count }}</span>
                  <span class="step-pill" :class="s.cls">{{ s.label }}</span>
                </div>
                <span v-if="i < statusSteps.length - 1" class="step-line" />
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- table header row -->
      <div class="list-toolbar">
        <span class="active-count">{{ totalProjects }} פרויקטים פעילים</span>
        <SearchPill v-model="search" placeholder="חיפוש" />
      </div>

      <table class="projects-table">
        <thead>
          <tr>
            <th class="th-idx">#</th>
            <th>שם פרויקט</th>
            <th>כתובת</th>
            <th>סוג פרויקט</th>
            <th>תיאור הפרויקט</th>
            <th>תאריך עדכון</th>
            <th>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(p, i) in projects"
            :key="p.id"
            class="project-row"
            :class="{ zebra: i % 2 === 1 }"
            @click="router.push(`/projects/${p.id}/quantities`)"
          >
            <td class="td-idx num">{{ String(i + 1).padStart(2, "0") }}</td>
            <td class="p-name">{{ p.name }}</td>
            <td>{{ p.location }}</td>
            <td class="td-type" :title="p.typeName">
              <AppIcon name="menu-reports" :size="18" />
            </td>
            <td class="td-desc ellipsis">{{ p.description || "---" }}</td>
            <td class="num">{{ formatDate(p.createdAt) }}</td>
            <td>
              <span class="pill pill-info">{{ projectStatus(p) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.new-project {
  display: inline-flex;
  gap: 8px;
  flex-direction: row-reverse;
}
.card {
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: 20px 24px;
  min-height: calc(100vh - 130px);
}
/* tiles */
.tiles {
  display: grid;
  grid-template-columns: 1.25fr 1.25fr 0.9fr 1.6fr;
  direction: rtl;
  gap: 16px;
  margin-bottom: 22px;
}
.tile {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 18px;
  min-height: 168px;
  box-shadow: var(--shadow-card);
}
.tile-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: right;
  margin-bottom: 10px;
}
.tile-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-height: 110px;
}
.types {
  flex-direction: row-reverse;
  justify-content: flex-start;
}
.type-legend {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}
.tl-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  justify-content: flex-start;
}
.tl-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  order: 1;
}
.tl-name {
  flex: 1;
  text-align: right;
  order: 2;
  color: var(--text-primary);
}
.tl-count {
  order: 3;
  font-weight: 700;
}
.sla-big :deep(svg) {
  width: 96px;
  height: 96px;
}
.updates {
  flex-direction: column;
  gap: 8px;
}
.updates-empty {
  font-size: 13px;
  color: var(--text-muted);
}
/* status stepper */
.statuses {
  padding: 0 6px;
}
.stepper {
  display: flex;
  align-items: flex-start;
  width: 100%;
  justify-content: space-between;
}
.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.step-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid var(--border-strong);
  background: var(--surface);
}
.step-count {
  font-size: 14px;
  font-weight: 700;
}
.step-line {
  flex: 1;
  border-top: 1.5px dotted var(--border-strong);
  margin-top: 4px;
}
.step-pill {
  font-size: 12px;
  border-radius: var(--radius-pill);
  border: 1px solid;
  padding: 1px 10px;
  white-space: nowrap;
}
.st-new {
  color: #e79b3c;
  border-color: #e79b3c;
  background: #fdf4e7;
}
.st-boq {
  color: var(--status-purple);
  border-color: var(--status-purple);
  background: #f3effe;
}
.st-tender {
  color: var(--info);
  border-color: var(--info);
  background: var(--info-soft);
}
.st-priced {
  color: var(--success);
  border-color: var(--success);
  background: var(--success-soft);
}
.st-contract {
  color: var(--text-secondary);
  border-color: var(--border-strong);
  background: var(--surface);
}
/* list */
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  margin-bottom: 8px;
}
.active-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
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
  height: 48px;
  border-bottom: 1px solid var(--divider);
}
.project-row {
  cursor: pointer;
}
.project-row.zebra {
  background: var(--surface-subtle);
}
.project-row:hover {
  background: var(--brand-primary-soft);
}
.th-idx,
.td-idx {
  width: 40px;
  color: var(--text-disabled);
}
.p-name {
  font-weight: 500;
}
.td-type {
  color: var(--text-secondary);
}
.td-desc {
  max-width: 260px;
  color: var(--text-secondary);
}
</style>
