import { onMounted, onBeforeUnmount } from "vue";

/* Only the top-most dialog answers Escape. A delete confirmation opened from
   inside a modal must close itself and leave the modal underneath it open —
   and an open dropdown closes before the dialog it sits in. */
const stack = [];

function onKey(e) {
  if (e.key !== "Escape") return;
  stack[stack.length - 1]?.(e);
}

/** Puts `handler` on top of the Escape stack; returns the function that takes it off. */
export function pushEscape(handler) {
  if (!stack.length) document.addEventListener("keydown", onKey);
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i >= 0) stack.splice(i, 1);
    if (!stack.length) document.removeEventListener("keydown", onKey);
  };
}

/** Runs `handler` when the user presses Escape while the component is mounted (modals/dialogs). */
export function useEscape(handler) {
  let off = null;
  onMounted(() => {
    off = pushEscape(handler);
  });
  onBeforeUnmount(() => off?.());
}
