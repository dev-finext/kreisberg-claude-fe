import { defineStore } from "pinia";
import seed from "@/mock/db.json";

const LS_KEY = "kreisberg-demo-db-v1";

function loadInitial() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.generatedAt === seed.generatedAt) return parsed;
    }
  } catch (e) {
    /* corrupted storage — fall back to seed */
  }
  return JSON.parse(JSON.stringify(seed));
}

/**
 * Single reactive "database". Domain stores read/write through this store;
 * every mutation is persisted to localStorage (demo persistence), and
 * resetDemo() restores the generated seed.
 */
export const useDbStore = defineStore("db", {
  state: () => ({
    db: loadInitial(),
  }),
  getters: {
    catalog: (s) => s.db.catalog,
    chapters: (s) => s.db.catalog.chapters,
    tags: (s) => s.db.tags,
    users: (s) => s.db.users,
    resourceTypes: (s) => s.db.resourceTypes,
    constructors: (s) => s.db.constructors,
    projects: (s) => s.db.projects,
    boqHeaders: (s) => s.db.boqHeaders,
    structureElements: (s) => s.db.structureElements,
    structureElementItems: (s) => s.db.structureElementItems,
    boqItems: (s) => s.db.boqItems,
    comments: (s) => s.db.comments,
    history: (s) => s.db.history,
    currentUser: (s) => s.db.users[2] || s.db.users[0], // אביחי גל-אור
    allItems: (s) => s.db.catalog.chapters.flatMap((c) => c.subChapters.flatMap((sc) => sc.items)),
  },
  actions: {
    persist() {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(this.db));
      } catch (e) {
        /* storage full/unavailable — demo keeps working in-memory */
      }
    },
    nextId(collection) {
      const list = this.db[collection];
      return list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
    },
    resetDemo() {
      this.db = JSON.parse(JSON.stringify(seed));
      try {
        localStorage.removeItem(LS_KEY);
      } catch (e) {
        /* ignore */
      }
    },
  },
});
