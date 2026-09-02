import { defineStore } from "pinia";
import { useDbStore } from "./db";
import { useCatalogStore } from "./catalog";
import { useUiStore } from "./ui";

/**
 * BOQ domain logic. Encodes the business rules from Matty's spec (v5),
 * the legacy frontend and the design briefs:
 *  - quantity lives on (item × structure element); parents/branches show sums
 *  - פרקים view = aggregated read-only quantities grouped by chapter
 *  - priority is 3-state and drives לסיכום (חובה→on+locked, לא חובה→off+locked)
 *  - alternatives: exactly one chosen (radio); switching transfers quantity
 *  - linked items: parent qty update cascades to same-unit children (confirm)
 *  - copy/paste items between elements; duplicate element deep-copies items
 *  - every meaningful field change is recorded in the item history
 */
export const useBoqStore = defineStore("boq", {
  state: () => ({
    /* editor ui state (per open BOQ) */
    activeBoqId: null,
    sidebarMode: "assignment", // 'assignment' (שיוך) | 'chapters' (פרקים)
    selectedElementId: null,
    checkedLeafElementIds: [], // tree leaf checkboxes (batch scope)
    checkedSubChapterIds: [], // פרקים mode multi-select
    checkedChapterIds: [],
    expandedElementIds: [],
    expandedChapterIds: [],
    checkedSeiIds: [], // item row checkboxes in the table
    expandedRowKeys: [], // expanded item rows (row panels)
    openAllRows: false, // תצוגת סעיפים פתוחים
    filters: {},
    searchTerm: "",
  }),

  getters: {
    db: () => useDbStore(),
    catalog: () => useCatalogStore(),

    activeBoq(state) {
      return this.db.boqHeaders.find((h) => h.id === state.activeBoqId) || null;
    },
    /* ---------- structure tree ---------- */
    elementsOfBoq(state) {
      return this.db.structureElements.filter((e) => e.boqId === state.activeBoqId);
    },
    elementById() {
      const m = new Map();
      for (const e of this.elementsOfBoq) m.set(e.id, e);
      return m;
    },
    elementTree() {
      const roots = [];
      const byParent = new Map();
      for (const e of this.elementsOfBoq) {
        const key = e.parentId || 0;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(e);
      }
      const build = (e) => ({ ...e, children: (byParent.get(e.id) || []).map(build) });
      for (const r of byParent.get(0) || []) roots.push(build(r));
      return roots;
    },
    selectedElement(state) {
      return this.elementById.get(state.selectedElementId) || null;
    },
  },

  actions: {
    /* =============== helpers =============== */
    isLeaf(elementId) {
      if (!elementId) return false; // 0 = the synthetic "הכל" root
      return !this.elementsOfBoq.some((e) => e.parentId === elementId);
    },
    descendantIds(elementId) {
      const out = [];
      const walk = (id) => {
        for (const c of this.elementsOfBoq.filter((e) => e.parentId === id)) {
          out.push(c.id);
          walk(c.id);
        }
      };
      walk(elementId);
      return out;
    },
    leafIdsUnder(elementId) {
      const ids = [elementId, ...this.descendantIds(elementId)];
      return ids.filter((id) => this.isLeaf(id));
    },
    allLeafIds() {
      return this.elementsOfBoq.filter((e) => this.isLeaf(e.id)).map((e) => e.id);
    },
    elementPath(elementId) {
      if (elementId === 0) return ["הכל"];
      const parts = [];
      let cur = this.elementById.get(elementId);
      while (cur) {
        parts.unshift(cur.name);
        cur = cur.parentId ? this.elementById.get(cur.parentId) : null;
      }
      return parts;
    },
    boqItemOf(itemId) {
      return this.db.boqItems.find((b) => b.boqId === this.activeBoqId && b.itemId === itemId) || null;
    },
    ensureBoqItem(itemId) {
      let bi = this.boqItemOf(itemId);
      if (!bi) {
        const item = this.catalog.item(itemId);
        bi = {
          id: this.db.nextId("boqItems"),
          boqId: this.activeBoqId,
          itemId,
          priority: item?.priority || "recommended",
          forSummary: item?.priority === "mandatory" ? true : item?.priority !== "optional",
          amortization: item?.amortization || 0,
          resourceTypeId: item?.resourceTypeId || null,
          resourceId: null,
          description: item?.description || "",
          chosenAlternativeId: null,
          parentId: item?.parentId || null,
        };
        this.db.db.boqItems.push(bi);
        this.db.persist();
      }
      return bi;
    },
    recordHistory(itemId, changes) {
      if (!changes.length) return;
      this.db.db.history.push({
        id: this.db.nextId("history"),
        boqId: this.activeBoqId,
        itemId,
        user: this.db.currentUser.name,
        ts: new Date().toISOString(),
        changes,
      });
      this.db.persist();
    },

    /* =============== editor session =============== */
    openBoq(boqId) {
      if (this.activeBoqId !== boqId) {
        this.$reset();
        this.activeBoqId = boqId;
        // default expansion: all branches expanded
        this.expandedElementIds = this.elementsOfBoq.filter((e) => !this.isLeaf(e.id)).map((e) => e.id);
      }
    },
    setMode(mode) {
      this.sidebarMode = mode;
      this.checkedSeiIds = [];
      this.expandedRowKeys = [];
      this.searchTerm = "";
      this.filters = {};
    },
    selectElement(elementId) {
      // clicking the selected element again deselects it (legacy rule)
      this.selectedElementId = this.selectedElementId === elementId ? null : elementId;
      this.checkedSeiIds = [];
      this.expandedRowKeys = [];
    },

    /* =============== table rows =============== */
    /**
     * שיוך mode rows for the selected element:
     *  - leaf: its own structure_element_items (editable qty)
     *  - branch/root: aggregated read-only sums over descendant leaves
     */
    assignmentRows() {
      if (this.selectedElementId === null) return { editable: false, rows: [] };
      const isRootAll = this.selectedElementId === 0;
      const leaf = !isRootAll && this.isLeaf(this.selectedElementId);
      const leafIds = isRootAll ? this.allLeafIds() : this.leafIdsUnder(this.selectedElementId);
      const seis = this.db.structureElementItems.filter(
        (s) => s.boqId === this.activeBoqId && leafIds.includes(s.elementId)
      );
      if (leaf) {
        return { editable: true, rows: seis.map((s) => this.rowFromSei(s)) };
      }
      // aggregate by item
      const byItem = new Map();
      for (const s of seis) {
        if (!byItem.has(s.itemId)) byItem.set(s.itemId, { itemId: s.itemId, qty: 0, seiIds: [] });
        const agg = byItem.get(s.itemId);
        agg.qty += s.qty;
        agg.seiIds.push(s.id);
      }
      return {
        editable: false,
        rows: [...byItem.values()].map((agg) => this.rowFromAggregate(agg)),
      };
    },
    rowFromSei(sei) {
      const item = this.catalog.item(sei.itemId);
      const bi = this.boqItemOf(sei.itemId);
      return this.decorateRow({ key: `sei-${sei.id}`, sei, seiIds: [sei.id], qty: sei.qty, item, bi, editable: true });
    },
    rowFromAggregate(agg) {
      const item = this.catalog.item(agg.itemId);
      const bi = this.boqItemOf(agg.itemId);
      return this.decorateRow({ key: `agg-${agg.itemId}`, sei: null, seiIds: agg.seiIds, qty: agg.qty, item, bi, editable: false });
    },
    decorateRow({ key, sei, seiIds, qty, item, bi, editable }) {
      return {
        key,
        sei,
        seiIds,
        item,
        bi,
        qty,
        editable,
        code: item?.code || "",
        name: item?.name || "",
        description: bi?.description ?? item?.description ?? "",
        unit: item?.unit || "",
        unit2: item?.unit2 || "",
        isComposite: item?.type === "composite",
        priority: bi?.priority ?? item?.priority ?? "recommended",
        forSummary: bi ? bi.forSummary : true,
        resourceTypeId: bi?.resourceTypeId ?? item?.resourceTypeId ?? null,
      };
    },
    /**
     * פרקים mode: aggregated rows across ALL elements, grouped by chapter →
     * sub-chapter, restricted to checked sub-chapters (or all when nothing
     * is checked). Non-chosen alternatives collapse beneath the chosen item.
     */
    chaptersRows() {
      const seis = this.db.structureElementItems.filter((s) => s.boqId === this.activeBoqId);
      const byItem = new Map();
      for (const s of seis) {
        if (!byItem.has(s.itemId)) byItem.set(s.itemId, { itemId: s.itemId, qty: 0, seiIds: [] });
        const agg = byItem.get(s.itemId);
        agg.qty += s.qty;
        agg.seiIds.push(s.id);
      }
      let rows = [...byItem.values()].map((agg) => this.rowFromAggregate(agg));
      if (this.checkedSubChapterIds.length) {
        rows = rows.filter((r) => this.checkedSubChapterIds.includes(r.item?.subChapterId));
      }
      // group chapter -> sub-chapter
      const groups = [];
      const byChapter = new Map();
      for (const r of rows) {
        const chId = r.item?.chapterId;
        if (!byChapter.has(chId)) {
          const g = { chapter: this.catalog.chapter(chId), subGroups: [], bySub: new Map() };
          byChapter.set(chId, g);
          groups.push(g);
        }
        const g = byChapter.get(chId);
        const scId = r.item?.subChapterId;
        if (!g.bySub.has(scId)) {
          const sg = { subChapter: this.catalog.subChapter(scId), rows: [] };
          g.bySub.set(scId, sg);
          g.subGroups.push(sg);
        }
        g.bySub.get(scId).rows.push(r);
      }
      for (const g of groups) delete g.bySub;
      return groups;
    },
    /** chapters/sub-chapters that have items in this BOQ (sidebar, פרקים mode) */
    usedChaptersTree() {
      const seis = this.db.structureElementItems.filter((s) => s.boqId === this.activeBoqId);
      const usedSubIds = new Set();
      for (const s of seis) {
        const item = this.catalog.item(s.itemId);
        if (item) usedSubIds.add(item.subChapterId);
      }
      const tree = [];
      for (const ch of this.db.chapters) {
        const subs = ch.subChapters.filter((sc) => usedSubIds.has(sc.id));
        if (subs.length) tree.push({ chapter: ch, subChapters: subs });
      }
      return tree;
    },

    /* =============== quantities + linked propagation =============== */
    /**
     * Returns {needsConfirm, children} when the item has same-unit children in
     * this BOQ; the caller shows the confirmation dialog, then calls
     * applyQtyUpdate(..., {cascade}).
     */
    prepareQtyUpdate(sei, newQty) {
      const item = this.catalog.item(sei.itemId);
      const children = this.catalog
        .childrenOf(sei.itemId)
        .filter((c) => c.unit === item.unit)
        .map((c) => c.id);
      const childSeis = this.db.structureElementItems.filter(
        (s) => s.boqId === this.activeBoqId && s.elementId === sei.elementId && children.includes(s.itemId)
      );
      return { needsConfirm: childSeis.length > 0, childSeis, newQty };
    },
    applyQtyUpdate(sei, newQty, { cascade = false, childSeis = [] } = {}) {
      const target = this.db.structureElementItems.find((s) => s.id === sei.id);
      if (!target) return;
      const from = target.qty;
      if (from === newQty) return;
      target.qty = newQty;
      this.recordHistory(target.itemId, [{ field: "qty", from: String(from), to: String(newQty) }]);
      if (cascade) {
        for (const cs of childSeis) {
          const c = this.db.structureElementItems.find((s) => s.id === cs.id);
          if (c && c.qty !== newQty) {
            this.recordHistory(c.itemId, [{ field: "qty", from: String(c.qty), to: String(newQty) }]);
            c.qty = newQty;
          }
        }
      }
      this.db.persist();
    },

    /* =============== add items =============== */
    /** items already present anywhere in this BOQ (picker "כבר נבחר") */
    itemIdsInBoq() {
      return new Set(
        this.db.structureElementItems.filter((s) => s.boqId === this.activeBoqId).map((s) => s.itemId)
      );
    },
    /** related (parent/children) catalog items of a selection, not yet in the BOQ */
    relatedItemsOf(itemIds) {
      const present = this.itemIdsInBoq();
      const rel = new Set();
      for (const id of itemIds) {
        const item = this.catalog.item(id);
        if (item?.parentId && !present.has(item.parentId) && !itemIds.includes(item.parentId)) rel.add(item.parentId);
        for (const c of this.catalog.childrenOf(id)) {
          if (!present.has(c.id) && !itemIds.includes(c.id)) rel.add(c.id);
        }
      }
      return [...rel].map((id) => this.catalog.item(id)).filter(Boolean);
    },
    addItems(itemIds, { toAllElements = false, elementIds = null } = {}) {
      const targets = elementIds || (toAllElements ? this.allLeafIds() : [this.selectedElementId]);
      let added = 0;
      for (const elId of targets) {
        if (!elId || !this.isLeaf(elId)) continue;
        for (const itemId of itemIds) {
          const exists = this.db.structureElementItems.some(
            (s) => s.boqId === this.activeBoqId && s.elementId === elId && s.itemId === itemId
          );
          if (exists) continue;
          this.db.db.structureElementItems.push({
            id: this.db.nextId("structureElementItems"),
            boqId: this.activeBoqId,
            elementId: elId,
            itemId,
            qty: 0,
          });
          this.ensureBoqItem(itemId);
          added++;
        }
      }
      this.db.persist();
      return added;
    },

    /* =============== copy / paste / delete =============== */
    copyCheckedItems() {
      const ui = useUiStore();
      const el = this.selectedElement;
      if (!el || !this.checkedSeiIds.length) return;
      ui.setClipboard(el.id, el.name, this.checkedSeiIds);
      ui.toast(`${this.checkedSeiIds.length} סעיפים הועתקו מ${el.name}`);
    },
    pasteItems() {
      const ui = useUiStore();
      const el = this.selectedElement;
      if (!el || !ui.clipboard.seiIds.length || ui.clipboard.sourceElementId === el.id) return;
      let count = 0;
      for (const seiId of ui.clipboard.seiIds) {
        const src = this.db.structureElementItems.find((s) => s.id === seiId);
        if (!src) continue;
        const existing = this.db.structureElementItems.find(
          (s) => s.boqId === this.activeBoqId && s.elementId === el.id && s.itemId === src.itemId
        );
        if (existing) {
          existing.qty += src.qty; // merge quantities on collision
        } else {
          this.db.db.structureElementItems.push({
            id: this.db.nextId("structureElementItems"),
            boqId: this.activeBoqId,
            elementId: el.id,
            itemId: src.itemId,
            qty: src.qty,
          });
        }
        count++;
      }
      this.db.persist();
      ui.toast(`${count} סעיפים הודבקו ל${el.name}`);
      this.checkedSeiIds = [];
    },
    deleteSeis(seiIds) {
      this.db.db.structureElementItems = this.db.db.structureElementItems.filter((s) => !seiIds.includes(s.id));
      this.checkedSeiIds = this.checkedSeiIds.filter((id) => !seiIds.includes(id));
      this.db.persist();
    },

    /* =============== structure element CRUD =============== */
    addElement({ name, description = "", parentId = null, inBudget = true }) {
      const el = {
        id: this.db.nextId("structureElements"),
        boqId: this.activeBoqId,
        parentId,
        name,
        description,
        visible: true,
        inBudget,
      };
      this.db.db.structureElements.push(el);
      if (parentId && !this.expandedElementIds.includes(parentId)) this.expandedElementIds.push(parentId);
      this.db.persist();
      return el;
    },
    updateElement(id, patch) {
      const el = this.db.db.structureElements.find((e) => e.id === id);
      if (el) {
        Object.assign(el, patch);
        this.db.persist();
      }
    },
    deleteElement(id) {
      const ids = [id, ...this.descendantIds(id)];
      this.db.db.structureElements = this.db.db.structureElements.filter((e) => !ids.includes(e.id));
      this.db.db.structureElementItems = this.db.db.structureElementItems.filter(
        (s) => !(s.boqId === this.activeBoqId && ids.includes(s.elementId))
      );
      if (ids.includes(this.selectedElementId)) this.selectedElementId = null;
      this.db.persist();
    },
    itemCountUnder(elementId) {
      const ids = [elementId, ...this.descendantIds(elementId)];
      return this.db.structureElementItems.filter(
        (s) => s.boqId === this.activeBoqId && ids.includes(s.elementId)
      ).length;
    },
    duplicateElement(id) {
      const src = this.elementById.get(id);
      if (!src) return null;
      const cloneTree = (srcEl, parentId) => {
        const copy = this.addElement({
          name: srcEl === src ? `${srcEl.name} - העתק 1` : srcEl.name,
          description: srcEl.description,
          parentId,
          inBudget: srcEl.inBudget,
        });
        for (const sei of this.db.structureElementItems.filter(
          (s) => s.boqId === this.activeBoqId && s.elementId === srcEl.id
        )) {
          this.db.db.structureElementItems.push({
            id: this.db.nextId("structureElementItems"),
            boqId: this.activeBoqId,
            elementId: copy.id,
            itemId: sei.itemId,
            qty: sei.qty,
          });
        }
        for (const child of this.elementsOfBoq.filter((e) => e.parentId === srcEl.id)) {
          cloneTree(child, copy.id);
        }
        return copy;
      };
      const copy = cloneTree(src, src.parentId);
      // insert the copy directly beneath the original (spec: "{name} - העתק 1" מתחת למקור)
      const all = this.db.db.structureElements;
      const copyIdx = all.findIndex((e) => e.id === copy.id);
      const [moved] = all.splice(copyIdx, 1);
      const srcIdx = all.findIndex((e) => e.id === src.id);
      all.splice(srcIdx + 1, 0, moved);
      this.db.persist();
      return copy;
    },
    moveElement(id, newParentId) {
      if (id === newParentId) return false;
      if (newParentId && this.descendantIds(id).includes(newParentId)) return false; // no cycles
      this.updateElement(id, { parentId: newParentId });
      if (newParentId && !this.expandedElementIds.includes(newParentId)) this.expandedElementIds.push(newParentId);
      return true;
    },
    toggleElementVisibility(id) {
      const el = this.db.db.structureElements.find((e) => e.id === id);
      if (el) {
        el.visible = !el.visible;
        this.db.persist();
      }
    },

    /* =============== priority / summary / item edit =============== */
    setPriority(itemId, priority) {
      const bi = this.ensureBoqItem(itemId);
      const changes = [{ field: "priority", from: bi.priority, to: priority }];
      bi.priority = priority;
      if (priority === "mandatory" && !bi.forSummary) {
        changes.push({ field: "forSummary", from: "false", to: "true" });
        bi.forSummary = true;
      }
      if (priority === "optional" && bi.forSummary) {
        changes.push({ field: "forSummary", from: "true", to: "false" });
        bi.forSummary = false;
      }
      this.recordHistory(itemId, changes);
      this.db.persist();
    },
    setForSummary(itemId, value) {
      const bi = this.ensureBoqItem(itemId);
      if (bi.priority === "mandatory" || bi.priority === "optional") return false; // locked
      if (bi.forSummary !== value) {
        this.recordHistory(itemId, [{ field: "forSummary", from: String(bi.forSummary), to: String(value) }]);
        bi.forSummary = value;
        this.db.persist();
      }
      return true;
    },
    updateBoqItem(itemId, patch) {
      const bi = this.ensureBoqItem(itemId);
      const changes = [];
      for (const [k, v] of Object.entries(patch)) {
        if (bi[k] !== v) changes.push({ field: k, from: String(bi[k]), to: String(v) });
      }
      Object.assign(bi, patch);
      this.recordHistory(itemId, changes);
      this.db.persist();
    },

    /* =============== alternatives =============== */
    alternativesOf(itemId) {
      const item = this.catalog.item(itemId);
      if (!item) return [];
      return item.alternativeIds.map((id) => this.catalog.item(id)).filter(Boolean);
    },
    /** the chosen item replaces `currentItemId` in every element, keeping quantities */
    chooseAlternative(currentItemId, chosenItemId) {
      if (currentItemId === chosenItemId) return;
      const seis = this.db.structureElementItems.filter(
        (s) => s.boqId === this.activeBoqId && s.itemId === currentItemId
      );
      for (const s of seis) s.itemId = chosenItemId;
      const oldBi = this.ensureBoqItem(currentItemId);
      const newBi = this.ensureBoqItem(chosenItemId);
      newBi.forSummary = true;
      oldBi.forSummary = false;
      this.recordHistory(chosenItemId, [
        { field: "chosenAlternative", from: this.catalog.item(currentItemId)?.name || "", to: this.catalog.item(chosenItemId)?.name || "" },
      ]);
      this.db.persist();
    },

    /* =============== replace item (החלפת סעיף) =============== */
    replaceItem(oldItemId, newItemId, scope /* 'this' | 'checked' | 'all' */) {
      let elementIds;
      if (scope === "this") elementIds = [this.selectedElementId];
      else if (scope === "checked") elementIds = this.checkedLeafElementIds;
      else elementIds = null; // all
      const seis = this.db.structureElementItems.filter(
        (s) =>
          s.boqId === this.activeBoqId &&
          s.itemId === oldItemId &&
          (elementIds ? elementIds.includes(s.elementId) : true)
      );
      for (const s of seis) s.itemId = newItemId;
      const oldBi = this.boqItemOf(oldItemId);
      const newBi = this.ensureBoqItem(newItemId);
      if (oldBi) {
        newBi.priority = oldBi.priority;
        newBi.forSummary = oldBi.forSummary;
      }
      this.recordHistory(newItemId, [
        { field: "replacedItem", from: this.catalog.item(oldItemId)?.code || "", to: this.catalog.item(newItemId)?.code || "" },
      ]);
      this.db.persist();
      return seis.length;
    },

    /* =============== comments & history =============== */
    commentsFor(scope, refId) {
      return this.db.comments
        .filter((c) => c.scope === scope && c.refId === refId && (c.boqId == null || c.boqId === this.activeBoqId))
        .sort((a, b) => b.ts.localeCompare(a.ts));
    },
    addComment(scope, refId, text) {
      this.db.db.comments.push({
        id: this.db.nextId("comments"),
        scope,
        refId,
        boqId: this.activeBoqId,
        author: this.db.currentUser.name,
        ts: new Date().toISOString(),
        text,
      });
      this.db.persist();
    },
    historyFor(itemId) {
      return this.db.history
        .filter((h) => h.boqId === this.activeBoqId && h.itemId === itemId)
        .sort((a, b) => b.ts.localeCompare(a.ts));
    },

    /* =============== BOQ headers (configurations) =============== */
    createBoqHeader({ projectId, name, catalogId, resourceTypeId = null, resourceId = null, detail = "" }) {
      const h = {
        id: this.db.nextId("boqHeaders"),
        projectId,
        name,
        isSource: !this.db.boqHeaders.some((b) => b.projectId === projectId),
        detail,
        docName: name,
        catalogId,
        classification: "spec",
        status: "draft",
        stagePills: [],
        resourceTypeId,
        resourceId,
        exitDate: "",
        sla: { late: 0, near: 0, ok: 0 },
        notes: "",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      this.db.db.boqHeaders.push(h);
      this.db.persist();
      return h;
    },
    updateBoqHeader(id, patch) {
      const h = this.db.db.boqHeaders.find((b) => b.id === id);
      if (h) {
        Object.assign(h, patch);
        this.db.persist();
      }
    },
    deleteBoqHeader(id) {
      this.db.db.boqHeaders = this.db.db.boqHeaders.filter((b) => b.id !== id);
      this.db.db.structureElements = this.db.db.structureElements.filter((e) => e.boqId !== id);
      this.db.db.structureElementItems = this.db.db.structureElementItems.filter((s) => s.boqId !== id);
      this.db.db.boqItems = this.db.db.boqItems.filter((b) => b.boqId !== id);
      this.db.persist();
    },
    duplicateBoqHeader(id) {
      const src = this.db.boqHeaders.find((b) => b.id === id);
      if (!src) return null;
      const siblings = this.db.boqHeaders.filter((b) => b.projectId === src.projectId && !b.isSource);
      const copy = {
        ...JSON.parse(JSON.stringify(src)),
        id: this.db.nextId("boqHeaders"),
        isSource: false,
        name: `תצורה ${siblings.length + 1}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      this.db.db.boqHeaders.push(copy);
      // deep-copy elements + items
      const idMap = new Map();
      for (const e of this.db.structureElements.filter((x) => x.boqId === id)) {
        const ne = { ...e, id: this.db.nextId("structureElements"), boqId: copy.id };
        idMap.set(e.id, ne.id);
        this.db.db.structureElements.push(ne);
      }
      for (const ne of this.db.db.structureElements.filter((x) => x.boqId === copy.id)) {
        if (ne.parentId) ne.parentId = idMap.get(ne.parentId) || null;
      }
      for (const s of this.db.structureElementItems.filter((x) => x.boqId === id)) {
        this.db.db.structureElementItems.push({
          ...s,
          id: this.db.nextId("structureElementItems"),
          boqId: copy.id,
          elementId: idMap.get(s.elementId),
        });
      }
      for (const b of this.db.boqItems.filter((x) => x.boqId === id)) {
        this.db.db.boqItems.push({ ...b, id: this.db.nextId("boqItems"), boqId: copy.id });
      }
      this.db.persist();
      return copy;
    },
  },
});
