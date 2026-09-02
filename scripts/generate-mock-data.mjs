/**
 * Generates the demo's mock database from the real catalog sample
 * (design-pack) + hand-seeded demo entities that mirror the Figma
 * reference screens (REF-08, REF-13, etc.).
 *
 * Output: src/mock/db.json  (single JSON document, imported by the app)
 *
 * Deterministic: a seeded PRNG is used so every run produces identical data.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CATALOG_SRC = "C:\\Users\\GAL-OR\\Desktop\\Clients\\KRE\\design-pack\\catalog-sample-358-items.json";

/* ---------------- deterministic PRNG ---------------- */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260902);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

/* ---------------- load + normalise catalog ---------------- */
const raw = JSON.parse(readFileSync(CATALOG_SRC, "utf8"));

// normalise Hebrew gershayim variants to the standard ASCII quote form used in the UI
const normUnit = (u) =>
  (u || "")
    .replace(/\u05f4/g, '"') // ״ -> "
    .replace(/\u05f3/g, "'") // ׳ -> '
    .trim();

const isNoteEntry = (it) => {
  const u = normUnit(it.measureUnit);
  return u === "" || u === "הערה" || !(it.name || "").trim();
};

const TAG_SEEDS = [
  { name: "חדר רטוב", match: ["רטוב", "מקלח", "אמבטי", "שירותים"] },
  { name: "בריכה", match: ["בריכ"] },
  { name: "שרותים", match: ["שירותים", "אסלה", "כיור"] },
  { name: "מעלית", match: ["מעלית"] },
  { name: "מטבח", match: ["מטבח"] },
  { name: "חניה", match: ["חני"] },
  { name: "גג", match: ["גג"] },
  { name: "קירות", match: ["קיר"] },
];

const RESOURCE_TYPES = [
  { id: 1, name: "קבלן ראשי" },
  { id: 2, name: "אדריכל" },
  { id: 3, name: "אינסטלטור" },
  { id: 4, name: "חשמלאי" },
  { id: 5, name: "קבלן שיפוצים" },
];

const CONSTRUCTORS = [
  { id: 1, name: "ירון צמח", typeId: 2 },
  { id: 2, name: "בני בטון בע\"מ", typeId: 1 },
  { id: 3, name: "אינסטלציית הצפון", typeId: 3 },
  { id: 4, name: "י.ד חשמל", typeId: 4 },
];

let itemAutoId = 1;
let subChapterAutoId = 1;
let chapterAutoId = 1;

const tags = TAG_SEEDS.map((t, i) => ({ id: i + 1, name: t.name }));
const chapters = [];

for (const ch of raw) {
  const chapter = {
    id: chapterAutoId++,
    code: ch.code,
    num: (ch.code || "").split(".")[0] || "",
    name: (ch.text || "").trim(),
    subChapters: [],
  };
  for (const sc of ch.subChapters || []) {
    const sub = {
      id: subChapterAutoId++,
      chapterId: chapter.id,
      code: sc.code,
      num: (sc.code || "").split(".")[1] || "",
      name: (sc.text || "").trim(),
      items: [],
    };
    for (const it of sc.items || []) {
      const note = isNoteEntry(it);
      const text = (it.text || "").trim();
      const name = (it.name || "").trim();
      const itemTags = [];
      if (!note) {
        for (let ti = 0; ti < TAG_SEEDS.length; ti++) {
          if (TAG_SEEDS[ti].match.some((m) => text.includes(m))) itemTags.push(ti + 1);
        }
      }
      // priority distribution: mostly recommended/optional, some mandatory
      const r = rand();
      const priority = note ? null : r < 0.15 ? "mandatory" : r < 0.55 ? "recommended" : "optional";
      const rt = rand();
      const resourceTypeId = note ? null : rt < 0.7 ? 1 : rt < 0.9 ? 2 : null;
      sub.items.push({
        id: itemAutoId++,
        key: `${it.code}|${text.slice(0, 50)}`, // codes are NOT unique — see BOQ-conflict-duplicates.xlsx
        subChapterId: sub.id,
        chapterId: chapter.id,
        code: it.code,
        name,
        description: text,
        unit: note ? "" : normUnit(it.measureUnit),
        unit2: "",
        isNote: note,
        type: "regular",
        tags: itemTags,
        resourceTypeId,
        priority,
        amortization: 0,
        parentId: null,
        alternativeIds: [],
        subItems: [],
      });
    }
    chapter.subChapters.push(sub);
  }
  chapters.push(chapter);
}

const allItems = chapters.flatMap((c) => c.subChapters.flatMap((s) => s.items));
const realItems = allItems.filter((i) => !i.isNote);
const findByCode = (code) => allItems.find((i) => i.code === code);

/* ---------------- composite worked example (brief §7.7) ---------------- */
function ensureItem(chNum, subName, fields) {
  let existing = findByCode(fields.code);
  if (existing) return existing;
  let chapter = chapters.find((c) => c.num === chNum) || chapters[0];
  let sub = chapter.subChapters[0];
  const item = {
    id: itemAutoId++,
    key: `${fields.code}|${fields.name}`,
    subChapterId: sub.id,
    chapterId: chapter.id,
    unit2: "",
    isNote: false,
    type: "regular",
    tags: [],
    resourceTypeId: 1,
    amortization: 0,
    parentId: null,
    alternativeIds: [],
    subItems: [],
    description: fields.name,
    ...fields,
  };
  sub.items.push(item);
  return item;
}

const subA = ensureItem("02", null, { code: "02.050.0100", name: "יציקת בטון ב-30 לעמודים", description: "יציקת בטון ב-30 לעמודים בשטחי חתך 0.05-0.20 מ\"ר\nפריסת כמויות ע\"פ קומות:\n* קומת מרתף בשטח כ-100 מ\"ר.\n* קומת קרקע בשטח כ-120 מ\"ר.\n* קומה ראשונה בשטח כ-80 מ\"ר.", unit: 'מ"ק', priority: "mandatory" });
const subB = ensureItem("06", null, { code: "06.950.0100", name: "יצירת מערכת טפסנות עבור עמודים", description: "יצירת מערכת טפסנות עבור עמודים", unit: 'מ"ר', priority: "recommended" });
const subC = ensureItem("23", null, { code: "23.045.0100", name: "פריסת ברזלים עבור עמודי בטון", description: "פריסת ברזלים עבור עמודי בטון", unit: 'מ"ק', priority: "recommended" });

const composite = ensureItem("10", null, {
  code: "10.03.0010",
  name: "יציקת עמודי בטון בשטחי חתך 20/40",
  description: "יציקת עמודי בטון בשטחי חתך 20/40 — סעיף מורכב הכולל בטון, טפסנות וברזל.",
  unit: "קומפ'",
  priority: "mandatory",
});
composite.type = "composite";
composite.subItems = [
  { itemId: subA.id, qty: 300 },
  { itemId: subB.id, qty: 300 },
  { itemId: subC.id, qty: 300 },
];

/* ---------------- alternatives + related (parent/children) ---------------- */
// alternatives: pick sub-chapters with >=3 real items, link first 3 as an alternatives group
let altGroups = 0;
for (const ch of chapters) {
  for (const sub of ch.subChapters) {
    const candidates = sub.items.filter((i) => !i.isNote && i.type === "regular");
    if (candidates.length >= 3 && altGroups < 12) {
      const [a, b, c] = candidates;
      a.alternativeIds = [b.id, c.id];
      b.alternativeIds = [a.id, c.id];
      c.alternativeIds = [a.id, b.id];
      altGroups++;
    }
  }
}
// related: within sub-chapters having >=2 real items, make item[0] parent of item[1]
let relCount = 0;
for (const ch of chapters) {
  for (const sub of ch.subChapters) {
    const candidates = sub.items.filter((i) => !i.isNote && !i.alternativeIds.length);
    if (candidates.length >= 2 && relCount < 15) {
      candidates[1].parentId = candidates[0].id;
      if (candidates.length >= 3) candidates[2].parentId = candidates[0].id;
      relCount++;
    }
  }
}

/* ---------------- demo entities (match the Figma reference screens) ---------------- */
const users = [
  { id: 1, name: "דני קרייסברג", role: "מפקח" },
  { id: 2, name: "מתי קרייסברג", role: "מפקח" },
  { id: 3, name: "אביחי גל-אור", role: "מנהל מערכת" },
];

const catalogMeta = { id: 3, name: "קטלוג מס' 3" };

const projects = [
  {
    id: 1,
    name: "דירת משפ' קרייסברג",
    location: "תל אביב",
    typeName: "שיפוץ דירה",
    author: "דני קרייסברג",
    createdAt: "2026-01-12",
    statusPills: [
      { label: "כתב כמויות", kind: "info" },
      { label: "תומחר", kind: "success" },
    ],
    description: "שיפוץ כללי לדירת מגורים כולל חדרים רטובים, ריצוף וחשמל.",
    active: true,
  },
  {
    id: 2,
    name: "מדנס - בית פרטי",
    location: "רמת השרון",
    typeName: "בנייה פרטית",
    author: "מתי קרייסברג",
    createdAt: "2026-03-18",
    statusPills: [{ label: "כתב כמויות", kind: "info" }],
    description: "תיאור ארוך של כתב כמויות",
    active: true,
  },
  {
    id: 3,
    name: 'פרויקט תמ"א 38 - הרצל 12',
    location: "גבעתיים",
    typeName: 'תמ"א 38',
    author: "דני קרייסברג",
    createdAt: "2026-03-26",
    statusPills: [{ label: "כתב כמויות", kind: "info" }],
    description: "חיזוק ותוספת קומות לבניין קיים.",
    active: true,
  },
];

/* BOQ headers = configurations (REF-08) */
const boqHeaders = [
  {
    id: 1,
    projectId: 1,
    name: "כתב כמויות - מקור",
    isSource: true,
    detail: "התצורה המקורית של כתב הכמויות",
    docName: "בנארית",
    catalogId: catalogMeta.id,
    classification: "spec", // מפרט
    status: "draft", // טיוטה
    stagePills: [{ label: "מכרז", count: 4, kind: "info" }, { label: "תומחר", kind: "success" }],
    resourceTypeId: 2,
    resourceId: 1,
    exitDate: "2023-03-21",
    sla: { late: 2, near: 1, ok: 12 },
    notes: "",
    createdAt: "2026-01-15",
  },
  {
    id: 2,
    projectId: 1,
    name: "תצורה 1",
    isSource: false,
    detail: "חלופת ריצוף גרניט פורצלן",
    docName: "בנארית",
    catalogId: catalogMeta.id,
    classification: "spec",
    status: "draft",
    stagePills: [{ label: "מכרז", count: 4, kind: "info" }],
    resourceTypeId: 2,
    resourceId: 1,
    exitDate: "2023-03-21",
    sla: { late: 0, near: 2, ok: 9 },
    notes: "",
    createdAt: "2026-01-20",
  },
  {
    id: 3,
    projectId: 1,
    name: "תצורה 2",
    isSource: false,
    detail: "ללא עבודות פיתוח",
    docName: "בנארית",
    catalogId: catalogMeta.id,
    classification: "spec",
    status: "final",
    stagePills: [{ label: "תומחר", kind: "success" }],
    resourceTypeId: 2,
    resourceId: 1,
    exitDate: "2023-04-02",
    sla: { late: 1, near: 0, ok: 12 },
    notes: "אושר ע\"י המפקח",
    createdAt: "2026-02-02",
  },
  {
    id: 4,
    projectId: 1,
    name: "תצורה 3",
    isSource: false,
    detail: "",
    docName: "בנארית",
    catalogId: catalogMeta.id,
    classification: "spec",
    status: "locked",
    stagePills: [],
    resourceTypeId: 2,
    resourceId: 1,
    exitDate: "2023-05-14",
    sla: { late: 0, near: 0, ok: 8 },
    notes: "",
    createdAt: "2026-02-10",
  },
  {
    id: 5,
    projectId: 2,
    name: "כתב כמויות מדנס",
    isSource: true,
    detail: "תיאור ארוך של כתב כמויות",
    docName: "מדנס",
    catalogId: catalogMeta.id,
    classification: "spec",
    status: "draft",
    stagePills: [],
    resourceTypeId: 1,
    resourceId: 2,
    exitDate: "",
    sla: { late: 0, near: 0, ok: 0 },
    notes: "",
    createdAt: "2026-03-18",
  },
  {
    id: 6,
    projectId: 3,
    name: 'כתב כמויות תמ"א',
    isSource: true,
    detail: "תיאור אופציונאלי",
    docName: 'תמ"א',
    catalogId: catalogMeta.id,
    classification: "spec",
    status: "draft",
    stagePills: [],
    resourceTypeId: 1,
    resourceId: 2,
    exitDate: "",
    sla: { late: 0, near: 0, ok: 0 },
    notes: "",
    createdAt: "2026-03-26",
  },
];

/* structure elements for BOQ 1 — matches REF-13 */
const structureElements = [
  { id: 1, boqId: 1, parentId: null, name: "קומה 1", description: "קומת כניסה", visible: true, inBudget: true },
  { id: 2, boqId: 1, parentId: 1, name: "חדר הורים", description: "", visible: true, inBudget: true },
  { id: 3, boqId: 1, parentId: 1, name: "חדר אורחים", description: "", visible: true, inBudget: true },
  { id: 4, boqId: 1, parentId: 1, name: "מטבח", description: "", visible: true, inBudget: true },
  { id: 5, boqId: 1, parentId: null, name: "קומה 2", description: "", visible: false, inBudget: true },
  { id: 6, boqId: 1, parentId: 5, name: "חדר רחצה", description: "", visible: true, inBudget: true },
  { id: 7, boqId: 1, parentId: 5, name: "חדר שינה", description: "", visible: true, inBudget: true },
  { id: 8, boqId: 1, parentId: null, name: "קומה 3", description: "", visible: true, inBudget: true },
];

/* pick real flooring / wet-room / electric items for the demo BOQ */
const flooring = realItems.filter((i) => i.code.startsWith("10.") && i.type === "regular").slice(0, 8);
const sealing = realItems.filter((i) => i.code.startsWith("05.") && i.type === "regular").slice(0, 5);
const electric = realItems.filter((i) => i.code.startsWith("08.") && i.type === "regular").slice(0, 6);
const plumbing = realItems.filter((i) => i.code.startsWith("07.") && i.type === "regular").slice(0, 5);

// guarantee a demonstrable linked-items pair: same unit, same element (חדר הורים)
if (flooring.length >= 3 && flooring[0].unit && flooring[2].unit === flooring[0].unit) {
  flooring[2].parentId = flooring[0].id;
}

let seiId = 1;
const structureElementItems = [];
function addSei(elementId, item, qty) {
  structureElementItems.push({ id: seiId++, boqId: 1, elementId, itemId: item.id, qty });
}
// leaves of קומה 1: חדר הורים(2), חדר אורחים(3), מטבח(4)
flooring.forEach((it, idx) => {
  addSei(2, it, 300 - idx * 20);
  if (idx < 5) addSei(3, it, 120 + idx * 10);
});
sealing.forEach((it, idx) => {
  addSei(2, it, 40 + idx * 5);
  if (idx < 3) addSei(4, it, 22 + idx * 3);
});
electric.forEach((it, idx) => {
  addSei(4, it, 6 + idx);
  if (idx < 4) addSei(6, it, 4 + idx);
});
plumbing.forEach((it, idx) => {
  if (idx < 4) addSei(6, it, 3 + idx);
  if (idx < 2) addSei(7, it, 2 + idx);
});
// composite item lives in חדר אורחים
addSei(3, composite, 3);
// a couple of items in קומה 3 (leaf) so paste demos have context
addSei(8, flooring[0], 80);

/* BOQ-level per-item overrides (aggregated level, like b_o_q_items) */
const usedItemIds = [...new Set(structureElementItems.map((s) => s.itemId))];
const itemById = new Map(
  chapters.flatMap((c) => c.subChapters.flatMap((s) => s.items)).map((i) => [i.id, i])
);
const boqItems = usedItemIds.map((itemId, i) => {
  const item = itemById.get(itemId);
  return {
    id: i + 1,
    boqId: 1,
    itemId,
    priority: item.priority,
    forSummary: item.priority === "mandatory" ? true : item.priority === "optional" ? false : rand() < 0.7,
    amortization: 0,
    resourceTypeId: item.resourceTypeId,
    resourceId: null,
    description: item.description,
    chosenAlternativeId: null,
    parentId: item.parentId,
  };
});

/* comments + history (REF-19 / REF-22) */
const comments = [
  { id: 1, scope: "chapter", refId: (chapters.find((c) => c.num === "10") || chapters[0]).id, boqId: 1, author: "דני קרייסברג", ts: "2026-08-02T10:14:00", text: "לוודא התאמת גוון הריצוף לבחירת האדריכל לפני הזמנה." },
  { id: 2, scope: "chapter", refId: (chapters.find((c) => c.num === "10") || chapters[0]).id, boqId: 1, author: "מתי קרייסברג", ts: "2026-08-03T09:30:00", text: "הכמויות בפרק זה כוללות פחת של 5%." },
  { id: 3, scope: "item", refId: flooring[0]?.id, boqId: 1, author: "דני קרייסברג", ts: "2026-08-05T12:00:00", text: "כמות מעודכנת לאחר מדידה בשטח." },
];

const history = [
  {
    id: 1,
    boqId: 1,
    itemId: flooring[0]?.id,
    user: "דני קרייסברג",
    ts: "2025-08-08T14:32:00",
    changes: [{ field: "qty", from: "280", to: "300" }],
  },
  {
    id: 2,
    boqId: 1,
    itemId: flooring[0]?.id,
    user: "דני קרייסברג",
    ts: "2025-07-03T09:12:00",
    changes: [
      { field: "description", from: "תשתית מרוצפת לאריחי חרסינה: אספקה והתקנת מרצפות", to: "ריצוף חדרים ומבואות בגמר חרסינה" },
      { field: "priority", from: "optional", to: "recommended" },
      { field: "forSummary", from: "false", to: "true" },
    ],
  },
];

/* ---------------- emit ---------------- */
const db = {
  generatedAt: "2026-09-02-v2",
  catalog: { ...catalogMeta, chapters },
  tags,
  resourceTypes: RESOURCE_TYPES,
  constructors: CONSTRUCTORS,
  users,
  projects,
  boqHeaders,
  structureElements,
  structureElementItems,
  boqItems,
  comments,
  history,
};

const outDir = join(ROOT, "src", "mock");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "db.json"), JSON.stringify(db, null, 1), "utf8");

console.log(
  `db.json written: ${chapters.length} chapters, ${allItems.length} items (${realItems.length} real), ` +
    `${structureElementItems.length} element-items, ${boqHeaders.length} BOQ headers`
);
