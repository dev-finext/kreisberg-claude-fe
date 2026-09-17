/**
 * Hover tooltip carrying the element's full text — but only while that text is
 * actually clipped, so a name that fits never grows a redundant tooltip.
 *
 * The trees and tables cut long chapter / building / item names to "…" to keep
 * their columns aligned; this puts the whole name one hover away.
 *
 *   <span class="lbl ellipsis" v-full-title>פרק {{ ch.num }}-{{ ch.name }}</span>
 *
 * Pass a value when the rendered text is not the text to show (markup, a label
 * built from several nodes):
 *
 *   <td class="ellipsis" v-full-title="r.name" v-html="highlight(r.name)" />
 *
 * The measurement is redone on pointer enter, which is the moment that decides
 * what the tooltip says: by then the panel has settled at whatever width it is
 * being hovered at, so the answer is right even when the column was a different
 * size when the row rendered.
 */
const STATE = Symbol("fullTitle");

function sync(el) {
  const state = el[STATE];
  if (!state) return;
  const full = String(state.value ?? el.textContent ?? "").trim();
  /* a pixel of slack: sub-pixel layout can push scrollWidth past clientWidth on
     text that is in fact whole */
  const clipped = el.scrollWidth - el.clientWidth > 1;
  if (full && clipped) el.setAttribute("title", full);
  else el.removeAttribute("title");
}

export const fullTitle = {
  mounted(el, binding) {
    const onEnter = () => sync(el);
    el[STATE] = { value: binding.value, onEnter };
    el.addEventListener("pointerenter", onEnter);
    sync(el);
  },
  updated(el, binding) {
    if (el[STATE]) el[STATE].value = binding.value;
    sync(el);
  },
  unmounted(el) {
    const state = el[STATE];
    if (state) el.removeEventListener("pointerenter", state.onEnter);
    delete el[STATE];
  },
};
