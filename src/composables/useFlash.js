import { ref, nextTick, onBeforeUnmount } from "vue";

/**
 * Scroll a freshly created row into view and hold it there.
 *
 * Mark the row with `:data-flash="flash.mark(id)"` so the composable can find
 * it once Vue has rendered it, and pair `isNew(id)` with `.flash-new` (soft
 * glow, for table rows) or `.flash-ring` (outline, for rows that carry a
 * selected background).
 */
export function revealFlashed(tag) {
  const el = document.querySelector(`[data-flash="${CSS.escape(tag)}"]`);
  if (!el) return false;
  /* smooth scrolling is driven by animation frames, which a hidden tab suspends,
     so fall back to an immediate jump rather than not moving at all */
  const animate =
    document.visibilityState === "visible" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: animate ? "smooth" : "auto" });
  return true;
}

export function useFlash(scope = "row", ms = 5000) {
  const ids = ref([]);
  const timers = [];

  function mark(id) {
    return `${scope}:${id}`;
  }

  async function flash(value, { reveal = true } = {}) {
    const list = (Array.isArray(value) ? value : [value]).filter((v) => v != null);
    if (!list.length) return;
    ids.value = [...new Set([...ids.value, ...list])];
    const t = setTimeout(() => {
      ids.value = ids.value.filter((id) => !list.includes(id));
    }, ms);
    timers.push(t);
    if (!reveal) return;
    await nextTick();
    revealFlashed(mark(list[0]));
  }

  function isNew(id) {
    return ids.value.includes(id);
  }

  onBeforeUnmount(() => timers.forEach(clearTimeout));

  return { ids, flash, isNew, mark };
}
