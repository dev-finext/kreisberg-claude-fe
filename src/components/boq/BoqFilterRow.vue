<script setup>
import { computed } from "vue";
import { useBoqStore } from "@/stores/boq";
import { useCatalogStore } from "@/stores/catalog";
import { useDbStore } from "@/stores/db";
import FilterRow from "@/components/shared/FilterRow.vue";

const boq = useBoqStore();
const cat = useCatalogStore();
const db = useDbStore();

/** filter definitions per mode; each option list is computed from current BOQ content */
const defs = computed(() => {
  const inBoqItems = [...boq.itemIdsInBoq].map((id) => cat.item(id)).filter(Boolean);
  const chapters = [...new Set(inBoqItems.map((i) => i.chapterId))]
    .map((id) => cat.chapter(id))
    .filter(Boolean);
  const subs = [...new Set(inBoqItems.map((i) => i.subChapterId))]
    .map((id) => cat.subChapter(id))
    .filter(Boolean);
  const priorities = [
    { value: "mandatory", label: "חובה" },
    { value: "recommended", label: "מומלץ" },
    { value: "optional", label: "לא חובה" },
  ];
  const summary = [
    { value: "true", label: "לסיכום" },
    { value: "false", label: "לא לסיכום" },
  ];
  const rts = db.resourceTypes.map((r) => ({ value: String(r.id), label: r.name }));
  const resources = db.constructors.map((c) => ({ value: String(c.id), label: c.name }));
  const names = inBoqItems.slice(0, 30).map((i) => ({ value: String(i.id), label: i.name }));

  if (boq.sidebarMode === "assignment") {
    return [
      {
        key: "chapter",
        label: "פרק",
        options: chapters.map((c) => ({ value: String(c.id), label: `${c.num}: ${c.name}` })),
      },
      {
        key: "subChapter",
        label: "תת פרק",
        options: subs.map((s) => ({ value: String(s.id), label: `${s.num}-${s.name}` })),
      },
      { key: "itemName", label: "שם סעיף", options: names },
      { key: "resourceType", label: "סוג משאב", options: rts },
      { key: "priority", label: "עדיפות", options: priorities },
      { key: "summary", label: "לסיכום", options: summary },
    ];
  }
  return [
    { key: "priority", label: "עדיפות", options: priorities },
    { key: "resourceType", label: "סוג משאב", options: rts },
    { key: "resource", label: "משאב", options: resources },
    { key: "summary", label: "לסיכום", options: summary },
  ];
});

const filters = computed({
  get: () => boq.filters,
  set: (v) => (boq.filters = v),
});
</script>

<template>
  <FilterRow v-model="filters" :defs="defs" @clear="boq.searchTerm = ''" />
</template>
