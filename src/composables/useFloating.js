import { ref, watch, nextTick, onBeforeUnmount, unref } from "vue";
import { pushEscape } from "./useEscape";

const EDGE = 8;

/** is the element still showing inside every box that clips it? */
function visibleInScrollers(el) {
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return false;
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
    const ar = a.getBoundingClientRect();
    if (r.bottom <= ar.top || r.top >= ar.bottom || r.right <= ar.left || r.left >= ar.right) return false;
  }
  return true;
}

/**
 * A dropdown or popover that floats above the page instead of living inside the
 * box that holds its trigger — so a table's scroll area, a modal's body or an
 * editor's frame can no longer cut it. The panel is rendered with
 * <Teleport to="body"> and bound to `style`.
 *
 * It sits against its trigger: below it, or above when the bottom has no room;
 * its right edge on the trigger's right edge (RTL), its centre on the trigger's
 * centre ("center"), or the trigger's full width ("stretch"); and it is slid
 * back inside the window. It closes on a mousedown outside trigger and panel,
 * on Escape (before any dialog underneath), and when the trigger scrolls out of
 * sight; otherwise it follows the trigger as the page scrolls.
 *
 * @param open    ref/computed — whether the panel is shown
 * @param options trigger: ref to the trigger element · panel: ref to the panel
 *                close(): hides it · align: "end" | "center" | "stretch"
 *                maxHeight: cap in px (the room left in the window caps it too)
 */
export function useFloating(open, { trigger, panel, close, align = "end", maxHeight = 320, gap = 4 }) {
  const style = ref({ position: "fixed", top: "0px", left: "0px", zIndex: 105, visibility: "hidden" });

  function place() {
    const t = unref(trigger);
    const p = unref(panel);
    if (!t || !p) return;
    /* (a window with no size — a hidden tab — has nothing to measure against) */
    if (window.innerWidth && !visibleInScrollers(t)) {
      close();
      return;
    }
    const tr = t.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = align === "stretch" ? tr.width : null;
    if (width) p.style.width = width + "px";
    const w = p.offsetWidth;
    const natural = p.scrollHeight;

    let top = tr.bottom + gap;
    let mh = maxHeight;
    if (vh) {
      const below = vh - tr.bottom - gap - EDGE;
      const above = tr.top - gap - EDGE;
      const want = Math.min(natural, maxHeight);
      if (want <= below || below >= above) {
        mh = Math.max(80, Math.min(maxHeight, below));
      } else {
        mh = Math.min(maxHeight, above);
        top = tr.top - gap - Math.min(natural, mh);
      }
    }
    let left =
      align === "center" ? tr.left + tr.width / 2 - w / 2 : align === "stretch" ? tr.left : tr.right - w;
    if (vw) left = Math.min(Math.max(left, EDGE), Math.max(EDGE, vw - w - EDGE));

    style.value = {
      position: "fixed",
      top: Math.round(top) + "px",
      left: Math.round(left) + "px",
      maxHeight: Math.round(mh) + "px",
      overflowY: "auto",
      zIndex: 105,
      ...(width ? { width: Math.round(width) + "px" } : {}),
      visibility: "visible",
    };
  }

  function onDown(e) {
    const t = unref(trigger);
    const p = unref(panel);
    if (t?.contains(e.target) || p?.contains(e.target)) return;
    close();
  }
  function onScroll(e) {
    const p = unref(panel);
    if (p && (e.target === p || p.contains?.(e.target))) return;
    place();
  }

  let offEscape = null;
  function bind() {
    document.addEventListener("mousedown", onDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    offEscape = pushEscape(() => close());
  }
  function unbind() {
    document.removeEventListener("mousedown", onDown, true);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", place);
    offEscape?.();
    offEscape = null;
  }

  watch(
    () => !!unref(open),
    async (isOpen) => {
      unbind();
      if (!isOpen) {
        style.value = { ...style.value, visibility: "hidden" };
        return;
      }
      await nextTick();
      place();
      bind();
    },
    { immediate: true }
  );
  /* the trigger can change while open (one panel shared by several buttons) */
  watch(
    () => unref(trigger),
    () => unref(open) && nextTick(place)
  );
  onBeforeUnmount(unbind);

  return { style, place };
}
