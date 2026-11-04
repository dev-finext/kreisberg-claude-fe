import { defineStore } from "pinia";

const PREFS_KEY = "kreisberg-demo-prefs-v1";

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

let toastSeq = 1;

/**
 * The dialogs a user can silence with "אל תציג הודעה זו שוב". Every one of them
 * is listed on the profile page so it can be turned back on, which is why each
 * carries the wording shown there.
 */
export const SUPPRESSIBLE_PROMPTS = [
  {
    key: "skipAddToAllStructuresPrompt",
    label: "הוספת סעיפים לכל המבנים",
    detail: "נשאלת אם להוסיף את הסעיפים לכל המבנים או רק למבנה הנוכחי.",
  },
  {
    key: "skipLinkedQtyPrompt",
    label: "עדכון כמות של סעיפים קשורים",
    detail: "נשאלת אם לעדכן גם את הכמות של הסעיפים הקשורים בעלי אותה יחידת מידה.",
  },
];

/* the line every one of those checkboxes carries, so the choice never feels final */
export const SUPPRESS_HINT = "ניתן להפעיל את ההודעה מחדש בכל עת בעמוד הפרופיל, תחת “הודעות ואישורים”.";

export const useUiStore = defineStore("ui", {
  state: () => ({
    toasts: [],
    // user preferences, kept in localStorage and editable on the profile page
    prefs: {
      skipAddToAllStructuresPrompt: false,
      skipLinkedQtyPrompt: false,
      // Figma shows the navy rail open with its labels by default
      railExpanded: true,
      ...loadPrefs(),
    },
    // clipboard for copy/paste of items between structure elements
    clipboard: {
      sourceElementId: null,
      sourceElementName: "",
      seiIds: [],
    },
  }),
  actions: {
    /** action: optional { label, to } link rendered beside the message */
    toast(text, type = "success", action = null) {
      const id = toastSeq++;
      this.toasts.push({ id, text, type, action });
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
      }, 4000);
    },
    dismissToast(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    },
    setPref(key, value) {
      this.prefs[key] = value;
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
      } catch (e) {
        /* ignore */
      }
    },
    setClipboard(sourceElementId, sourceElementName, seiIds) {
      this.clipboard = { sourceElementId, sourceElementName, seiIds: [...seiIds] };
    },
    clearClipboard() {
      this.clipboard = { sourceElementId: null, sourceElementName: "", seiIds: [] };
    },
  },
});
