import { defineStore } from "pinia";
import seed from "@demo/db.json";

const LS_KEY = "kreisberg-demo-db-v1";

function loadInitial() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.generatedAt === seed.generatedAt) return parsed;
    }
  } catch {
    /* corrupted storage — fall back to seed */
  }
  return JSON.parse(JSON.stringify(seed));
}

/**
 * Single reactive "database" seeded from demo-data/db.json (throwaway demo
 * content). Domain stores read/write through this store; every mutation is
 * persisted to localStorage for the session, and resetDemo() restores the seed.
 */
export const useDbStore = defineStore("db", {
  state: () => ({
    db: loadInitial(),
  }),
  getters: {
    catalog: (s) => s.db.catalog,
    catalogs: (s) => s.db.catalogs,
    chapters: (s) => s.db.catalog.chapters,
    tags: (s) => s.db.tags,
    users: (s) => s.db.users,
    resourceTypes: (s) => s.db.resourceTypes,
    constructors: (s) => s.db.constructors,
    contacts: (s) => s.db.contacts,
    projects: (s) => s.db.projects,
    projectTypes: (s) => s.db.projectTypes,
    projectTemplates: (s) => s.db.projectTemplates,
    conditions: (s) => s.db.conditions,
    docFolders: (s) => s.db.docFolders,
    documents: (s) => s.db.documents,
    mappings: (s) => s.db.mappings,
    mappingSystemFields: (s) => s.db.mappingSystemFields,
    boqHeaders: (s) => s.db.boqHeaders,
    structureElements: (s) => s.db.structureElements,
    structureElementItems: (s) => s.db.structureElementItems,
    boqItems: (s) => s.db.boqItems,
    comments: (s) => s.db.comments,
    history: (s) => s.db.history,
    tenders: (s) => s.db.tenders,
    currentUser: (s) => s.db.users.find((u) => u.id === s.db.currentUserId) || s.db.users[0],
    allItems: (s) => s.db.catalog.chapters.flatMap((c) => c.subChapters.flatMap((sc) => sc.items)),
  },
  actions: {
    persist() {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(this.db));
      } catch {
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
      } catch {
        /* ignore */
      }
    },
  },
});
