import { ref, onBeforeUnmount } from "vue";

/**
 * Highlight freshly created rows for a few seconds so a new פרק / תת פרק /
 * סעיף / תגית is easy to spot among the ones that were already there.
 *
 * Pair `isNew(id)` with `.flash-new` (soft glow, for table rows) or
 * `.flash-ring` (outline, for rows that carry a selected background).
 */
export function useFlash(ms = 5000) {
  const ids = ref([]);
  const timers = [];

  function flash(value) {
    const list = (Array.isArray(value) ? value : [value]).filter((v) => v != null);
    if (!list.length) return;
    ids.value = [...new Set([...ids.value, ...list])];
    const t = setTimeout(() => {
      ids.value = ids.value.filter((id) => !list.includes(id));
    }, ms);
    timers.push(t);
  }
  function isNew(id) {
    return ids.value.includes(id);
  }

  onBeforeUnmount(() => timers.forEach(clearTimeout));

  return { ids, flash, isNew };
}
