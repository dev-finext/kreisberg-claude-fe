import { defineStore } from "pinia";
import { useDbStore } from "./db";

/**
 * Draft state for the project "כללי" tab, shared with the page-level
 * שמור button in ProjectView. Holds unsaved values for both an existing
 * project and the "new project" flow.
 */
export const useProjectFormStore = defineStore("projectForm", {
  state: () => ({
    sourceId: null, // project id or null for a new project
    draft: emptyDraft(),
  }),
  actions: {
    loadProject(project) {
      if (project) {
        this.sourceId = project.id;
        this.draft = {
          name: project.name,
          location: project.location || "",
          typeId: project.typeId || null,
          templateId: project.templateId || null,
          description: project.description || "",
          specialFields: JSON.parse(JSON.stringify(project.specialFields || [])),
          assets: JSON.parse(JSON.stringify(project.assets || [])),
        };
      } else {
        this.sourceId = null;
        this.draft = emptyDraft();
      }
    },
    /** persists the draft; returns the project id (creates the project when new) */
    save() {
      const db = useDbStore();
      const d = this.draft;
      if (!d.name.trim()) return { error: "נא להזין שם פרויקט" };
      const typeName = db.projectTypes.find((t) => t.id === d.typeId)?.name || "";
      if (this.sourceId) {
        const p = db.db.projects.find((x) => x.id === this.sourceId);
        if (p) {
          Object.assign(p, {
            name: d.name.trim(),
            location: d.location.trim(),
            typeId: d.typeId,
            typeName,
            templateId: d.templateId,
            description: d.description,
            specialFields: d.specialFields.filter((f) => f.name || f.value),
            assets: d.assets,
          });
          db.persist();
        }
        return { id: this.sourceId, created: false };
      }
      const p = {
        id: db.nextId("projects"),
        name: d.name.trim(),
        location: d.location.trim(),
        typeId: d.typeId,
        typeName,
        author: db.currentUser.name,
        createdAt: new Date().toISOString().slice(0, 10),
        status: "חדש",
        statusPills: [],
        description: d.description,
        active: true,
        contactIds: [],
        specialFields: d.specialFields.filter((f) => f.name || f.value),
        templateId: d.templateId,
        assets: d.assets,
      };
      db.db.projects.push(p);
      db.persist();
      this.sourceId = p.id;
      return { id: p.id, created: true };
    },
  },
});

function emptyDraft() {
  return {
    name: "",
    location: "",
    typeId: null,
    templateId: null,
    description: "",
    specialFields: [{ name: "", value: "" }],
    assets: [],
  };
}
