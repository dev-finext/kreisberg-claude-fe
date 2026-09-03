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

export const useUiStore = defineStore("ui", {
  state: () => ({
    toasts: [],
    railExpanded: false,
    // user preferences ("אל תציג הודעה זו שוב")
    prefs: {
      skipAddToAllStructuresPrompt: false,
      skipLinkedQtyPrompt: false,
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
    toast(text, type = "success") {
      const id = toastSeq++;
      this.toasts.push({ id, text, type });
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
