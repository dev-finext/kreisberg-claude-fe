import { defineStore } from "pinia";
import { useDbStore } from "./db";

/**
 * Catalog domain: lookups + the picker's cascading query logic
 * (chapter → sub-chapter → tag → free text), per Matty's spec and the
 * design brief §8.
 */
export const useCatalogStore = defineStore("catalog", {
  getters: {
    chapters() {
      return useDbStore().chapters;
    },
    itemById() {
      const map = new Map();
      for (const it of useDbStore().allItems) map.set(it.id, it);
      return map;
    },
    subChapterById() {
      const map = new Map();
      for (const ch of useDbStore().chapters) for (const sc of ch.subChapters) map.set(sc.id, sc);
      return map;
    },
    chapterById() {
      const map = new Map();
      for (const ch of useDbStore().chapters) map.set(ch.id, ch);
      return map;
    },
    tagById() {
      const map = new Map();
      for (const t of useDbStore().tags) map.set(t.id, t);
      return map;
    },
  },
  actions: {
    item(id) {
      return this.itemById.get(id) || null;
    },
    subChapter(id) {
      return this.subChapterById.get(id) || null;
    },
    chapter(id) {
      return this.chapterById.get(id) || null;
    },
    chapterOfItem(item) {
      return this.chapterById.get(item.chapterId) || null;
    },
    /** children of an item (items whose parentId === item.id), across the catalog */
    childrenOf(itemId) {
      return useDbStore().allItems.filter((i) => i.parentId === itemId);
    },
    /** sub-chapters of a chapter, sorted alphabetically (picker rule) */
    subChaptersOf(chapterId, { alphabetical = true } = {}) {
      const ch = this.chapterById.get(chapterId);
      if (!ch) return [];
      const list = [...ch.subChapters];
      if (alphabetical) list.sort((a, b) => a.name.localeCompare(b.name, "he"));
      return list;
    },
    chaptersSorted() {
      return [...useDbStore().chapters].sort((a, b) => a.name.localeCompare(b.name, "he"));
    },
    /**
     * Tags relevant to the current chapter/sub-chapter scope:
     * only tags that actually occur on items in scope (brief §8.2 rule 3).
     */
    tagsInScope({ chapterId = null, subChapterId = null } = {}) {
      const tagIds = new Set();
      for (const it of this.itemsInScope({ chapterId, subChapterId })) {
        for (const t of it.tags) tagIds.add(t);
      }
      return useDbStore()
        .tags.filter((t) => tagIds.has(t.id))
        .sort((a, b) => a.name.localeCompare(b.name, "he"));
    },
    itemsInScope({ chapterId = null, subChapterId = null } = {}) {
      const db = useDbStore();
      let items;
      if (subChapterId) {
        const sc = this.subChapterById.get(subChapterId);
        items = sc ? sc.items : [];
      } else if (chapterId) {
        const ch = this.chapterById.get(chapterId);
        items = ch ? ch.subChapters.flatMap((s) => s.items) : [];
      } else {
        items = db.allItems;
      }
      return items;
    },
    /**
     * The picker query. Note rows (measureUnit empty / "הערה") are excluded.
     * Free text matches item code, name, description and unit (case-insensitive).
     * Returns items grouped by chapter → sub-chapter, plus a flat list.
     */
    pickerSearch({ chapterId = null, subChapterId = null, tagId = null, term = "" } = {}) {
      const t = (term || "").trim().toLowerCase();
      let items = this.itemsInScope({ chapterId, subChapterId }).filter((i) => !i.isNote);
      if (tagId) items = items.filter((i) => i.tags.includes(tagId));
      if (t) {
        items = items.filter(
          (i) =>
            i.code.toLowerCase().includes(t) ||
            (i.name || "").toLowerCase().includes(t) ||
            (i.description || "").toLowerCase().includes(t) ||
            (i.unit || "").toLowerCase().includes(t)
        );
      }
      // group by chapter → sub-chapter (in catalog order)
      const groups = [];
      const byChapter = new Map();
      for (const it of items) {
        if (!byChapter.has(it.chapterId)) {
          const ch = this.chapterById.get(it.chapterId);
          const g = { chapter: ch, subGroups: [], bySub: new Map() };
          byChapter.set(it.chapterId, g);
          groups.push(g);
        }
        const g = byChapter.get(it.chapterId);
        if (!g.bySub.has(it.subChapterId)) {
          const sg = { subChapter: this.subChapterById.get(it.subChapterId), items: [] };
          g.bySub.set(it.subChapterId, sg);
          g.subGroups.push(sg);
        }
        g.bySub.get(it.subChapterId).items.push(it);
      }
      for (const g of groups) delete g.bySub;
      return { items, groups };
    },
  },
});
