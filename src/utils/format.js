/** Shared formatting helpers (he-IL, tabular output expected from callers via .num class). */

export function formatDate(value) {
  if (!value) return "---";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "---";
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

/** "08.08.2025, 14:32" — the history-tab format (spec requires date + time). */
export function formatDateTime(value) {
  const date = formatDate(value);
  const time = formatTime(value);
  return time ? `${date}, ${time}` : date;
}

export function formatQty(value, digits = 2) {
  const n = Number(value);
  return Number.isNaN(n) ? "---" : n.toFixed(digits);
}
