import { onMounted, onBeforeUnmount } from "vue";

/** Runs `handler` when the user presses Escape while the component is mounted (modals/dialogs). */
export function useEscape(handler) {
  const onKey = (e) => {
    if (e.key === "Escape") handler(e);
  };
  onMounted(() => document.addEventListener("keydown", onKey));
  onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
}
