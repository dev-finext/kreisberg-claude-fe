/**
 * A button's box as a plain object, for ContextMenu's `anchor`. Takes the
 * element or its DOMRect. (A DOMRect cannot be kept in reactive state: its
 * getters refuse a proxy.)
 */
export function anchorRect(target) {
  const r = target.getBoundingClientRect ? target.getBoundingClientRect() : target;
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
}
