import { onMounted, onBeforeUnmount } from "vue";

/* Only the top-most dialog answers Escape. A delete confirmation opened from
   inside a modal must close itself and leave the modal underneath it open. */
const stack = [];

function onKey(e) {
  if (e.key !== "Escape") return;
  stack[stack.length - 1]?.(e);
}

/** Runs `handler` when the user presses Escape while the component is mounted (modals/dialogs). */
export function useEscape(handler) {
  onMounted(() => {
    if (!stack.length) document.addEventListener("keydown", onKey);
    stack.push(handler);
  });
  onBeforeUnmount(() => {
    const i = stack.lastIndexOf(handler);
    if (i >= 0) stack.splice(i, 1);
    if (!stack.length) document.removeEventListener("keydown", onKey);
  });
}
