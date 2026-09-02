/**
 * DEMO DATA GENERATOR — everything in this folder is throwaway demo content.
 * Delete the whole `demo-data/` folder when moving to production.
 *
 * Builds demo-data/db.json from the real catalog sample (design-pack) plus
 * hand-seeded demo entities that mirror the Figma reference screens.
 * Deterministic: a seeded PRNG keeps every run identical.
 *
 * Run: npm run gen:data
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_SRC_CANDIDATES = [
  "C:\\Users\\GAL-OR\\Desktop\\Clients\\KRE\\design-pack\\catalog-sample-358-items.json",
  join(__dirname, "catalog-source.json"),
];

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

/* ---------------- load + normalise catalog ---------------- */
const srcPath = CATALOG_SRC_CANDIDATES.find((p) => existsSync(p));
if (!srcPath) throw new Error("catalog source json not found");
const raw = JSON.parse(readFileSync(srcPath, "utf8"));
// keep a committed copy of the source next to the generator so the repo is self-contained
if (!existsSync(join(__dirname, "catalog-source.json"))) {
  writeFileSync(join(__dirname, "catalog-source.json"), JSON.stringify(raw), "utf8");
}

const normUnit = (u) =>
  (u || "")
    .replace(/\u05f4/g, '"')
    .replace(/\u05f3/g, "'")
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
  { id: 2, name: 'בני בטון בע"מ', typeId: 1 },
  { id: 3, name: "אינסטלציית הצפון", typeId: 3 },
  { id: 4, name: "י.ד חשמל", typeId: 4 },
  { id: 5, name: 'מולי קבלנות ויזמות בע"מ', typeId: 1 },
  { id: 6, name: "פאי ניהול וביצוע פרויקטים", typeId: 1 },
  { id: 7, name: 'רני הנדסה בע"מ', typeId: 1 },
  { id: 8, name: 'אלכסנדר סטייל סטון בע"מ', typeId: 5 },
  { id: 9, name: 'זד קונקריט בע"מ', typeId: 1 },
  { id: 10, name: 'ציון בריגה ובניו חברה לבניה ופיתוח בע"מ', typeId: 1 },
  { id: 11, name: 'א.י נבו בנתניה חברה קבלנית לבנין בע"מ', typeId: 1 },
  { id: 12, name: 'נחום משה חב\' להשקעות ובניה בע"מ', typeId: 1 },
  { id: 13, name: 'קטש יזמות ובניה בע"מ', typeId: 1 },
  { id: 14, name: 'בנימין זיגדון נדל"ן ובניה בע"מ', typeId: 5 },
  { id: 15, name: 'א.ד אדריכלים בע"מ תל אביב', typeId: 2 },
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
      const r = rand();
      const priority = note ? null : r < 0.15 ? "mandatory" : r < 0.55 ? "recommended" : "optional";
      const rt = rand();
      const resourceTypeId = note ? null : rt < 0.7 ? 1 : rt < 0.9 ? 2 : null;
      sub.items.push({
        id: itemAutoId++,
        key: `${it.code}|${text.slice(0, 50)}`, // codes are NOT unique in the real data
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
        amortization: note ? 0 : rand() < 0.3 ? 15 : 0,
        parentId: null,
        alternativeIds: [],
        subItems: [],
      });
    }
    chapter.subChapters.push(sub);
  }
  chapters.push(chapter);
}

const allItems = () => chapters.flatMap((c) => c.subChapters.flatMap((s) => s.items));
const realItems = () => allItems().filter((i) => !i.isNote);
const findByCode = (code) => allItems().find((i) => i.code === code);

/* ---------------- composite worked example (design brief §7.7) ---------------- */
function ensureItem(chNum, fields) {
  const existing = findByCode(fields.code);
  if (existing) return existing;
  const chapter = chapters.find((c) => c.num === chNum) || chapters[0];
  const sub = chapter.subChapters[0];
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

const subA = ensureItem("02", {
  code: "02.050.0100",
  name: "יציקת בטון ב-30 לעמודים",
  description:
    'יציקת בטון ב-30 לעמודים בשטחי חתך 0.05-0.20 מ"ר\nפריסת כמויות ע"פ קומות:\n* קומת מרתף בשטח כ-100 מ"ר.\n* קומת קרקע בשטח כ-120 מ"ר.\n* קומה ראשונה בשטח כ-80 מ"ר.',
  unit: 'מ"ק',
  priority: "mandatory",
});
const subB = ensureItem("06", {
  code: "06.950.0100",
  name: "יצירת מערכת טפסנות עבור עמודים",
  description: "יצירת מערכת טפסנות עבור עמודים",
  unit: 'מ"ר',
  priority: "recommended",
});
const subC = ensureItem("23", {
  code: "23.045.0100",
  name: "פריסת ברזלים עבור עמודי בטון",
  description: "פריסת ברזלים עבור עמודי בטון",
  unit: 'מ"ק',
  priority: "recommended",
});
const composite = ensureItem("10", {
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

/* ---------------- alternatives + related ---------------- */
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

/* ---------------- users / people ---------------- */
const users = [
  { id: 1, name: "דני קרייסברג", role: "מפקח" },
  { id: 2, name: "מתי קרייסברג", role: "מפקח" },
  { id: 3, name: "אביחי גל-אור", role: "מנהל מערכת" },
];
const currentUserId = 1;

const CONTACT_ROLES = ['מנכ"ל', "מנהל זוטר", "עובד"];
const firstNames = ["יוסי", "רן", "דנה", "אבי", "מיכל", "עומר", "שרה", "גיא", "נועה", "אלי", "תמר", "דוד"];
const lastNames = ["זילבר", "לוי", "כהן", "ברק", "פרץ", "שמעוני", "אשכנזי", "מור", "חדד", "ביטון", "אזולאי", "גל"];
const contacts = firstNames.map((fn, i) => {
  const c = CONSTRUCTORS[i % CONSTRUCTORS.length];
  return {
    id: i + 1,
    firstName: fn,
    lastName: lastNames[i],
    role: CONTACT_ROLES[i % 3],
    phone: `052-56789${String(i).padStart(2, "0")}`,
    email: `${["zila", "levi", "cohen", "barak", "peretz", "shimoni", "ash", "mor", "hadad", "biton", "azulay", "gal"][i]}@gmail.com`,
    hp: String(511678900 + i),
    address: `מנחם בגין ${50 + i}, תל אביב-יפו`,
    business: c.name,
    resourceTypeId: c.typeId,
    constructorId: c.id,
  };
});

/* ---------------- projects ---------------- */
const PROJECT_TYPES = [
  { id: 1, name: "בית" },
  { id: 2, name: "דירה" },
  { id: 3, name: "בניין" },
  { id: 4, name: "מסחר" },
  { id: 5, name: "אחר" },
];

const PROJECT_STATUSES = ["חדש", "כתב כמויות", "מכרז", "תומחר", "חוזה"];
const projectSeed = [
  ["דירת משפ' קרייסברג", "אהוד מנור 12, נתניה", 2, "שיפוץ כללי לדירת מגורים כולל חדרים רטובים, ריצוף וחשמל.", "תומחר"],
  ["מדנס - בית פרטי", "דובדבן 60, כפר חיטים", 1, "תיאור ארוך של כתב כמויות", "כתב כמויות"],
  ['פרויקט תמ"א 38 - הרצל 12', "הרצל 12, גבעתיים", 3, "חיזוק ותוספת קומות לבניין קיים.", "כתב כמויות"],
  ["בית משפחת חכם", "דובדבן 60, כפר חיטים", 1, "---", "חוזה"],
  ["בית משפחת רוטר", "התמר 10, הרצליה", 1, "---", "חוזה"],
  ["בניין ברחוב אבן גבירול 10", "אבן גבירול 10, תל-אביב", 3, "בניין לשימור", "מכרז"],
  ["בוטיק נספרסו סניף עכו", "שדרות בן גוריון 2, עכו", 4, "---", "חדש"],
  ["בניין ברחוב גיבורי ישראל 7", "גיבורי ישראל 7, נתניה", 3, "כחלק מפרויקט שיכון ובינוי ערים של עיריית נתניה", "מכרז"],
  ["בניין ברחוב המלך דוד 6", "המלך דוד 6, ירושלים", 3, "---", "כתב כמויות"],
  ["מרכז מסחרי דרך העצמאות", "דרך העצמאות 48, חיפה", 4, "שיפוץ קומת מסחר וחזיתות", "תומחר"],
  ["וילה בשכונת דניה", "דרך אלנבי 3, חיפה", 1, "בנייה פרטית חדשה", "חדש"],
  ["מחסן לוגיסטי מודיעין", 'שדרות המלאכה 7, מודיעין', 5, "הקמת מחסן ומשרדים", "כתב כמויות"],
];
const projects = projectSeed.map(([name, location, typeId, description, status], i) => ({
  id: i + 1,
  name,
  location,
  typeId,
  typeName: PROJECT_TYPES.find((t) => t.id === typeId).name,
  author: i % 2 ? "מתי קרייסברג" : "דני קרייסברג",
  createdAt: `2026-0${(i % 8) + 1}-${String((i * 3 + 4) % 27 + 1).padStart(2, "0")}`,
  status,
  statusPills:
    status === "חדש"
      ? []
      : status === "כתב כמויות"
        ? [{ label: "כתב כמויות", kind: "info" }]
        : status === "מכרז"
          ? [{ label: "מכרז", kind: "info" }]
          : status === "תומחר"
            ? [
                { label: "כתב כמויות", kind: "info" },
                { label: "תומחר", kind: "success" },
              ]
            : [{ label: "חוזה", kind: "neutral" }],
  description,
  active: true,
  contactIds: i < 3 ? [((i * 2) % 12) + 1, ((i * 2 + 1) % 12) + 1, ((i * 2 + 2) % 12) + 1] : [],
  specialFields: i === 0 ? [{ name: "מספר היתר", value: "2024-118" }] : [],
  templateId: null,
}));

const projectTemplates = [
  { id: 1, name: "תבנית שיפוץ דירה" },
  { id: 2, name: 'תבנית תמ"א 38' },
  { id: 3, name: "תבנית בנייה פרטית" },
];

/* ---------------- conditions ---------------- */
const conditions = [
  { id: 1, projectId: 1, text: "התנאי שרשמתי כתוב פה ואני יכולה למחוק עם הפח" },
  { id: 2, projectId: 1, text: "העבודות יבוצעו בימים א'-ה' בין השעות 07:00-17:00 בלבד" },
  { id: 3, projectId: 2, text: "הקבלן אחראי לפינוי פסולת בניין לאתר מורשה" },
];

/* ---------------- documents ---------------- */
const docFolders = [
  "תכניות אדריכליות",
  "קומת מרתף",
  "גג עליון",
  "חזיתות",
  "תכניות קונסטרוקציה",
  "תכניות חשמל",
  "תכניות תאורה",
  "תכניות מיזוג אויר",
  "הדמיות",
].map((name, i) => ({ id: i + 1, projectId: 1, name }));

const documents = [
  ["הסכם התקשרות קבלן ראשי", "PDF", "חוזה", 1, 2],
  ["בקשה להצעת מחיר - ריצוף", "PDF", "בקשה להצעת מחיר", 2, 1],
  ["תכנית קומת מרתף", "DWG", "תוכנית", 2, 2],
  ["תכנית חשמל קומה א'", "DWG", "תוכנית", 6, 4],
  ["כתב כמויות בנארית", "XLSX", "כתב כמויות", 1, 2],
  ["הדמיית חזית מזרחית", "JPG", "הדמיה", 9, 1],
  ["מפרט טכני חדרים רטובים", "PDF", "מפרט", 1, 3],
  ["בקשה להצעת מחיר - איטום", "PDF", "בקשה להצעת מחיר", 2, 1],
].map(([name, fileType, subType, folderId, resourceTypeId], i) => ({
  id: i + 1,
  projectId: 1,
  folderId,
  name,
  fileType,
  subType,
  resourceTypeId,
  resourceId: CONSTRUCTORS.find((c) => c.typeId === resourceTypeId)?.id ?? null,
  createdAt: "2024-08-07",
  updatedAt: "2023-03-21T15:33:00",
}));

/* ---------------- catalogs (metadata list; content shared for demo) ---------------- */
const catalogMeta = { id: 3, name: "קטלוג מס' 3" };
const catalogs = [
  { id: 1, name: "קטלוג 1", lang: "עברית", active: true, uploadedAt: "2024-08-07", updatedAt: "2023-03-21T15:33:00" },
  { id: 2, name: "בנארית", lang: "עברית", active: true, uploadedAt: "2024-08-07", updatedAt: "2023-03-21T15:33:00" },
  { id: 3, name: "קטלוג מס' 3", lang: "עברית", active: true, uploadedAt: "2024-08-07", updatedAt: "2023-03-21T15:33:00" },
  { id: 4, name: "קטלוג מאסטר", lang: "עברית", active: true, uploadedAt: "2024-08-07", updatedAt: "2023-03-21T15:33:00" },
];

/* ---------------- mappings (ייבוא/מיפוי כתב כמויות) ---------------- */
const MAPPING_SYSTEM_FIELDS = [
  { key: "code", label: "מספר סעיף", required: true },
  { key: "unit", label: "יח' מידה", required: true },
  { key: "qty", label: "כמות", required: false },
  { key: "mandatory", label: "חובה", required: false },
  { key: "priority", label: "עדיפות", required: false },
  { key: "summary", label: "לסיכום", required: false },
];
const mappings = [
  {
    id: 1,
    name: "בנארית",
    active: true,
    columns: { code: "מס' פריט", unit: "יח'", qty: "כמות חוזה", mandatory: "", priority: "", summary: "" },
  },
];

/* ---------------- BOQ headers (configurations) ---------------- */
const boqHeaders = [
  {
    id: 1,
    projectId: 1,
    name: "כתב כמויות - מקור",
    isSource: true,
    detail: "התצורה המקורית של כתב הכמויות",
    docName: "בנארית",
    catalogId: 3,
    classification: "spec",
    status: "draft",
    stagePills: [
      { label: "מכרז", count: 4, kind: "info" },
      { label: "תומחר", kind: "success" },
    ],
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
    catalogId: 3,
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
    catalogId: 3,
    classification: "spec",
    status: "final",
    stagePills: [{ label: "תומחר", kind: "success" }],
    resourceTypeId: 2,
    resourceId: 1,
    exitDate: "2023-04-02",
    sla: { late: 1, near: 0, ok: 12 },
    notes: 'אושר ע"י המפקח',
    createdAt: "2026-02-02",
  },
  {
    id: 4,
    projectId: 1,
    name: "תצורה 3",
    isSource: false,
    detail: "",
    docName: "בנארית",
    catalogId: 3,
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
    catalogId: 3,
    classification: "spec",
    status: "draft",
    stagePills: [],
    resourceTypeId: 1,
    resourceId: 2,
    exitDate: "",
    sla: { late: 0, near: 0, ok: 3 },
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
    catalogId: 3,
    classification: "spec",
    status: "draft",
    stagePills: [{ label: "מכרז", count: 2, kind: "info" }],
    resourceTypeId: 1,
    resourceId: 2,
    exitDate: "2023-06-01",
    sla: { late: 1, near: 1, ok: 4 },
    notes: "",
    createdAt: "2026-03-26",
  },
];

/* ---------------- structure elements ---------------- */
const structureElements = [
  // project 1 / boq 1 — matches the Figma reference tree
  { id: 1, boqId: 1, parentId: null, name: "קומה 1", description: "קומת כניסה", visible: true, inBudget: true },
  { id: 2, boqId: 1, parentId: 1, name: "חדר הורים", description: "", visible: true, inBudget: true },
  { id: 3, boqId: 1, parentId: 1, name: "חדר אורחים", description: "", visible: true, inBudget: true },
  { id: 4, boqId: 1, parentId: 1, name: "מטבח", description: "", visible: true, inBudget: true },
  { id: 5, boqId: 1, parentId: null, name: "קומה 2", description: "", visible: false, inBudget: true },
  { id: 6, boqId: 1, parentId: 5, name: "חדר רחצה", description: "", visible: true, inBudget: true },
  { id: 7, boqId: 1, parentId: 5, name: "חדר שינה", description: "", visible: true, inBudget: true },
  { id: 8, boqId: 1, parentId: null, name: "קומה 3", description: "", visible: true, inBudget: true },
  // boq 5 (מדנס)
  { id: 9, boqId: 5, parentId: null, name: "מבנה 1", description: "", visible: true, inBudget: true },
  { id: 10, boqId: 5, parentId: 9, name: "קומת קרקע", description: "", visible: true, inBudget: true },
  { id: 11, boqId: 5, parentId: 9, name: "קומה ראשונה", description: "", visible: true, inBudget: true },
  { id: 12, boqId: 5, parentId: null, name: "פיתוח שטח", description: "", visible: true, inBudget: true },
  // boq 6 (תמ"א)
  { id: 13, boqId: 6, parentId: null, name: "קומת כניסה", description: "", visible: true, inBudget: true },
  { id: 14, boqId: 6, parentId: null, name: "חדרים רטובים", description: "", visible: true, inBudget: true },
];

/* ---------------- structure element items ---------------- */
const real = realItems();
const byPrefix = (p) => real.filter((i) => i.code.startsWith(p) && i.type === "regular");
const flooring = byPrefix("10.").slice(0, 8);
const sealing = byPrefix("05.").slice(0, 5);
const electric = byPrefix("08.").slice(0, 6);
const plumbing = byPrefix("07.").slice(0, 5);
const concrete = byPrefix("02.").slice(0, 5);
const paint = byPrefix("11.").slice(0, 4);

// guarantee a demonstrable linked-items pair (same unit, same element)
if (flooring.length >= 3 && flooring[0].unit && flooring[2].unit === flooring[0].unit) {
  flooring[2].parentId = flooring[0].id;
}

let seiId = 1;
const structureElementItems = [];
function addSei(boqId, elementId, item, qty) {
  if (!item) return;
  structureElementItems.push({ id: seiId++, boqId, elementId, itemId: item.id, qty });
}
// boq 1
flooring.forEach((it, idx) => {
  addSei(1, 2, it, 300 - idx * 20);
  if (idx < 5) addSei(1, 3, it, 120 + idx * 10);
});
sealing.forEach((it, idx) => {
  addSei(1, 2, it, 40 + idx * 5);
  if (idx < 3) addSei(1, 4, it, 22 + idx * 3);
});
electric.forEach((it, idx) => {
  addSei(1, 4, it, 6 + idx);
  if (idx < 4) addSei(1, 6, it, 4 + idx);
});
plumbing.forEach((it, idx) => {
  if (idx < 4) addSei(1, 6, it, 3 + idx);
  if (idx < 2) addSei(1, 7, it, 2 + idx);
});
addSei(1, 3, composite, 3);
addSei(1, 8, flooring[0], 80);
// boq 5 (מדנס)
concrete.forEach((it, idx) => {
  addSei(5, 10, it, 34 + idx * 3);
  if (idx < 3) addSei(5, 11, it, 13 + idx);
});
paint.forEach((it, idx) => addSei(5, 10, it, 55 + idx * 5));
flooring.slice(0, 4).forEach((it, idx) => addSei(5, 12, it, 18 + idx * 4));
// boq 6 (תמ"א)
sealing.forEach((it, idx) => addSei(6, 14, it, [200, 50, 100, 60, 30][idx] || 20));
plumbing.slice(0, 3).forEach((it, idx) => addSei(6, 14, it, 5 + idx));
electric.slice(0, 3).forEach((it, idx) => addSei(6, 13, it, 44 - idx * 10));

/* ---------------- BOQ-level per-item overrides ---------------- */
const itemById = new Map(allItems().map((i) => [i.id, i]));
const boqItems = [];
let biId = 1;
for (const boqId of [1, 5, 6]) {
  const used = [...new Set(structureElementItems.filter((s) => s.boqId === boqId).map((s) => s.itemId))];
  for (const itemId of used) {
    const item = itemById.get(itemId);
    boqItems.push({
      id: biId++,
      boqId,
      itemId,
      priority: item.priority,
      forSummary: item.priority === "mandatory" ? true : item.priority === "optional" ? false : rand() < 0.7,
      amortization: item.amortization || 0,
      resourceTypeId: item.resourceTypeId,
      resourceId: null,
      description: item.description,
      chosenAlternativeId: null,
      parentId: item.parentId,
    });
  }
}

/* ---------------- comments + history ---------------- */
const ch10 = chapters.find((c) => c.num === "10") || chapters[0];
const comments = [
  {
    id: 1,
    scope: "chapter",
    refId: ch10.id,
    boqId: 1,
    author: "דני קרייסברג",
    ts: "2026-08-02T10:14:00",
    text: "לוודא התאמת גוון הריצוף לבחירת האדריכל לפני הזמנה.",
  },
  {
    id: 2,
    scope: "chapter",
    refId: ch10.id,
    boqId: 1,
    author: "מתי קרייסברג",
    ts: "2026-08-03T09:30:00",
    text: "הכמויות בפרק זה כוללות פחת של 5%.",
  },
  {
    id: 3,
    scope: "item",
    refId: flooring[0]?.id,
    boqId: 1,
    author: "דני קרייסברג",
    ts: "2026-08-05T12:00:00",
    text: "כמות מעודכנת לאחר מדידה בשטח.",
  },
  {
    id: 4,
    scope: "subChapter",
    refId: flooring[0]?.subChapterId,
    boqId: 1,
    author: "דני קרייסברג",
    ts: "2026-08-06T08:20:00",
    text: "אריחים חתוכים לפי מידה יסופקו ע\"י המזמין.",
  },
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
      {
        field: "description",
        from: "תשתית מרוצפת לאריחי חרסינה: אספקה והתקנת מרצפות",
        to: "ריצוף חדרים ומבואות בגמר חרסינה",
      },
      { field: "priority", from: "optional", to: "recommended" },
      { field: "forSummary", from: "false", to: "true" },
    ],
  },
];

/* ---------------- tenders ---------------- */
const tenders = [
  {
    id: 1,
    boqId: 1,
    roleTypeId: 1,
    contractorIds: [5, 6, 7, 9],
    dueDate: "2024-08-15",
    message: "",
    sentAt: "2026-02-12T10:00:00",
  },
];

/* ---------------- emit ---------------- */
const db = {
  generatedAt: "2026-09-02-v3",
  currentUserId,
  catalog: { ...catalogMeta, chapters },
  catalogs,
  tags,
  resourceTypes: RESOURCE_TYPES,
  constructors: CONSTRUCTORS,
  contacts,
  users,
  projectTypes: PROJECT_TYPES,
  projectTemplates,
  projects,
  conditions,
  docFolders,
  documents,
  mappingSystemFields: MAPPING_SYSTEM_FIELDS,
  mappings,
  boqHeaders,
  structureElements,
  structureElementItems,
  boqItems,
  comments,
  history,
  tenders,
};

writeFileSync(join(__dirname, "db.json"), JSON.stringify(db, null, 1), "utf8");
console.log(
  `demo-data/db.json written: ${projects.length} projects, ${chapters.length} chapters, ${allItems().length} items, ` +
    `${structureElementItems.length} element-items, ${boqHeaders.length} BOQ headers, ${contacts.length} contacts, ${documents.length} documents`
);
