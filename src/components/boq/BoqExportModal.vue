<script setup>
import { computed } from "vue";
import { useDbStore } from "@/stores/db";
import { useCatalogStore } from "@/stores/catalog";
import { PRIORITY_LABELS } from "@/constants";
import { formatDate } from "@/utils/format";
import AppIcon from "@/components/shared/AppIcon.vue";
import { useEscape } from "@/composables/useEscape";

const props = defineProps({
  boqId: { type: Number, required: true },
});
const emit = defineEmits(["close"]);
useEscape(() => emit("close"));

const db = useDbStore();
const cat = useCatalogStore();

const header = computed(() => db.boqHeaders.find((h) => h.id === props.boqId) || null);
const project = computed(() => db.projects.find((p) => p.id === header.value?.projectId) || null);
const resourceType = computed(
  () => db.resourceTypes.find((t) => t.id === header.value?.resourceTypeId)?.name || ""
);
const resource = computed(() => db.constructors.find((c) => c.id === header.value?.resourceId)?.name || "");

/** aggregate every structure-element item of this BOQ, grouped chapter → sub-chapter */
const groups = computed(() => {
  const seis = db.structureElementItems.filter((s) => s.boqId === props.boqId);
  const byItem = new Map();
  for (const s of seis) {
    if (!byItem.has(s.itemId)) byItem.set(s.itemId, 0);
    byItem.set(s.itemId, byItem.get(s.itemId) + s.qty);
  }
  const out = [];
  const byChapter = new Map();
  for (const [itemId, qty] of byItem) {
    const item = cat.item(itemId);
    if (!item) continue;
    const bi = db.boqItems.find((b) => b.boqId === props.boqId && b.itemId === itemId);
    const row = {
      item,
      qty,
      priority: bi?.priority ?? item.priority,
      forSummary: bi ? bi.forSummary : true,
      resourceTypeId: bi?.resourceTypeId ?? item.resourceTypeId,
    };
    if (!byChapter.has(item.chapterId)) {
      const g = { chapter: cat.chapter(item.chapterId), subGroups: [], bySub: new Map() };
      byChapter.set(item.chapterId, g);
      out.push(g);
    }
    const g = byChapter.get(item.chapterId);
    if (!g.bySub.has(item.subChapterId)) {
      const sg = { subChapter: cat.subChapter(item.subChapterId), rows: [] };
      g.bySub.set(item.subChapterId, sg);
      g.subGroups.push(sg);
    }
    g.bySub.get(item.subChapterId).rows.push(row);
  }
  for (const g of out) delete g.bySub;
  return out;
});

const totals = computed(() => {
  let items = 0;
  let summary = 0;
  for (const g of groups.value)
    for (const sg of g.subGroups)
      for (const r of sg.rows) {
        items++;
        if (r.forSummary) summary++;
      }
  return { items, summary };
});

function resourceTypeName(id) {
  return db.resourceTypes.find((t) => t.id === id)?.name || "--";
}
function print() {
  window.print();
}
</script>

<template>
  <Teleport to="body">
    <div class="export-overlay">
      <!-- toolbar (hidden when printing) -->
      <div class="export-toolbar no-print">
        <div class="tb-left">
          <button class="btn btn-primary" @click="print">
            <AppIcon name="file" :size="16" />
            <span>הדפסה / ייצוא PDF</span>
          </button>
          <button class="btn btn-secondary" @click="emit('close')">סגירה</button>
        </div>
        <span class="tb-hint">תצוגת מסמך להדפסה — בחלון ההדפסה ניתן לשמור כ-PDF</span>
      </div>

      <!-- printable document -->
      <div class="export-doc">
        <header class="doc-head">
          <div class="brand">
            <div class="brand-name">KREISBERG</div>
            <div class="brand-sub">When quantity meets quality</div>
          </div>
          <div class="doc-meta">
            <h1 class="doc-h1">כתב כמויות</h1>
            <div class="doc-title">{{ header?.name }}</div>
          </div>
        </header>

        <section class="meta-grid">
          <div>
            <span class="m-label">פרויקט</span><span class="m-value">{{ project?.name }}</span>
          </div>
          <div>
            <span class="m-label">כתובת</span><span class="m-value">{{ project?.location }}</span>
          </div>
          <div>
            <span class="m-label">סיווג</span
            ><span class="m-value">{{ header?.classification === "spec" ? "מפרט" : "תמחור" }}</span>
          </div>
          <div>
            <span class="m-label">סוג משאב</span><span class="m-value">{{ resourceType || "--" }}</span>
          </div>
          <div>
            <span class="m-label">זיהוי משאב</span><span class="m-value">{{ resource || "--" }}</span>
          </div>
          <div>
            <span class="m-label">תאריך</span
            ><span class="m-value num">{{ formatDate(new Date().toISOString()) }}</span>
          </div>
        </section>

        <table class="doc-table">
          <thead>
            <tr>
              <th class="c-code">מס' סעיף</th>
              <th class="c-name">שם הסעיף</th>
              <th class="c-rt">סוג משאב</th>
              <th class="c-unit">יח' מידה</th>
              <th class="c-qty">כמות</th>
              <th class="c-prio">עדיפות</th>
              <th class="c-sum">לסיכום</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="g in groups" :key="g.chapter.id">
              <tr class="g-chapter">
                <td colspan="7">פרק {{ g.chapter.num }} - {{ g.chapter.name }}</td>
              </tr>
              <template v-for="sg in g.subGroups" :key="sg.subChapter.id">
                <tr class="g-sub">
                  <td colspan="7">תת פרק {{ sg.subChapter.num }} - {{ sg.subChapter.name }}</td>
                </tr>
                <tr v-for="r in sg.rows" :key="r.item.id">
                  <td class="num">{{ r.item.code }}</td>
                  <td>{{ r.item.name }}</td>
                  <td>{{ resourceTypeName(r.resourceTypeId) }}</td>
                  <td>{{ r.item.unit }}</td>
                  <td class="num">{{ Number(r.qty).toFixed(2) }}</td>
                  <td>{{ PRIORITY_LABELS[r.priority] }}</td>
                  <td>{{ r.forSummary ? "✓" : "" }}</td>
                </tr>
              </template>
            </template>
            <tr v-if="!groups.length">
              <td colspan="7" class="empty">אין סעיפים בכתב כמויות זה</td>
            </tr>
          </tbody>
        </table>

        <footer class="doc-foot">
          <span
            >סה"כ סעיפים: <span class="num">{{ totals.items }}</span></span
          >
          <span
            >סעיפים לסיכום: <span class="num">{{ totals.summary }}</span></span
          >
          <span class="foot-note">הופק ממערכת "חישובים בראש טוב"</span>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.export-overlay {
  position: fixed;
  inset: 0;
  background: var(--page-bg);
  z-index: 80;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0 40px;
}
.export-toolbar {
  position: sticky;
  top: 0;
  width: 100%;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  padding: 12px 32px;
  z-index: 2;
}
.tb-left {
  display: flex;
  gap: 12px;
  flex-direction: row-reverse;
}
.tb-left .btn {
  gap: 6px;
  flex-direction: row-reverse;
}
.tb-hint {
  font-size: 12px;
  color: var(--text-secondary);
}
.export-doc {
  background: #fff;
  width: 800px;
  max-width: 96vw;
  margin: 28px 0;
  padding: 40px 44px;
  box-shadow: var(--shadow-card);
  color: #222;
}
.doc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: row-reverse;
  border-bottom: 2px solid var(--rail-navy);
  padding-bottom: 14px;
  margin-bottom: 18px;
}
.brand-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  direction: ltr;
  color: var(--rail-navy);
}
.brand-sub {
  font-size: 9px;
  color: var(--text-secondary);
  direction: ltr;
}
.doc-meta {
  text-align: right;
}
.doc-h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--rail-navy);
}
.doc-title {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 24px;
  margin-bottom: 20px;
}
.meta-grid > div {
  display: flex;
  flex-direction: column;
  text-align: right;
}
.m-label {
  font-size: 11px;
  color: var(--text-secondary);
}
.m-value {
  font-size: 13px;
  color: #222;
  font-weight: 600;
}
.doc-table {
  width: 100%;
  border-collapse: collapse;
}
.doc-table th {
  font-size: 12px;
  font-weight: 700;
  text-align: right;
  padding: 8px 8px;
  border-bottom: 2px solid var(--border-strong);
  background: var(--surface-subtle);
  color: #222;
}
.doc-table td {
  font-size: 12px;
  text-align: right;
  padding: 6px 8px;
  border-bottom: 1px solid var(--divider);
}
.c-qty,
.c-prio,
.c-sum,
.c-unit {
  width: 68px;
}
.c-code {
  width: 96px;
}
.g-chapter td {
  background: #eef2fa;
  font-weight: 700;
  font-size: 12px;
  padding: 6px 8px;
}
.g-sub td {
  background: var(--surface-subtle);
  font-size: 11px;
  padding: 5px 8px;
  padding-right: 18px;
}
.doc-foot {
  display: flex;
  gap: 28px;
  flex-direction: row-reverse;
  justify-content: flex-start;
  border-top: 2px solid var(--border-strong);
  margin-top: 16px;
  padding-top: 12px;
  font-size: 12px;
  font-weight: 600;
}
.foot-note {
  margin-right: auto;
  color: var(--text-secondary);
  font-weight: 400;
}
.empty {
  text-align: center;
  color: var(--text-muted);
  padding: 30px 0;
}
</style>
