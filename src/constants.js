/** Domain enums + Hebrew labels, single source of truth for the UI. */

export const PRIORITY = Object.freeze({
  MANDATORY: "mandatory",
  RECOMMENDED: "recommended",
  OPTIONAL: "optional",
});

export const PRIORITY_LABELS = Object.freeze({
  [PRIORITY.MANDATORY]: "חובה",
  [PRIORITY.RECOMMENDED]: "מומלץ",
  [PRIORITY.OPTIONAL]: "לא חובה",
});

/** priority level used by the 3-square compact control */
export const PRIORITY_LEVELS = Object.freeze({
  [PRIORITY.MANDATORY]: 3,
  [PRIORITY.RECOMMENDED]: 2,
  [PRIORITY.OPTIONAL]: 1,
});

export const BOQ_STATUS = Object.freeze({
  DRAFT: "draft",
  FINAL: "final",
  LOCKED: "locked",
});

export const BOQ_STATUS_LABELS = Object.freeze({
  [BOQ_STATUS.DRAFT]: "טיוטה",
  [BOQ_STATUS.FINAL]: "סופי",
  [BOQ_STATUS.LOCKED]: "נעול",
});

export const CLASSIFICATION_LABELS = Object.freeze({
  spec: "מפרט",
  pricing: "תמחור",
});

export const SIDEBAR_MODE = Object.freeze({
  ASSIGNMENT: "assignment", // שיוך
  CHAPTERS: "chapters", // פרקים
});

/** history-tab field + value labels */
export const HISTORY_FIELD_LABELS = Object.freeze({
  qty: "כמות",
  priority: "עדיפות",
  forSummary: "לסיכום",
  description: "תיאור",
  amortization: "פחת",
  chosenAlternative: "סעיף חלופי",
  replacedItem: "החלפת סעיף",
  resourceTypeId: "סוג משאב",
  resourceId: "זיהוי משאב",
});

export const HISTORY_VALUE_LABELS = Object.freeze({
  mandatory: "חובה",
  recommended: "מומלץ",
  optional: "לא חובה",
  true: "לסיכום",
  false: "לא לסיכום",
});
