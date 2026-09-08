/**
 * Descriptions and notes are authored in the rich-text editor, so they are
 * stored as HTML. Tables and one-line summaries want plain text; panels and
 * note cards render the markup. Everything the editor can emit is listed here,
 * and anything else is dropped before it reaches the page.
 */

const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "DIV",
  "EM",
  "FONT",
  "I",
  "IMG",
  "LI",
  "OL",
  "P",
  "S",
  "SPAN",
  "STRIKE",
  "STRONG",
  "SUB",
  "SUP",
  "U",
  "UL",
  "VIDEO",
]);
const ALLOWED_ATTRS = new Set([
  "alt",
  "class",
  "color",
  "controls",
  "download",
  "face",
  "href",
  "size",
  "src",
  "style",
  "title",
  "type",
]);
const ALLOWED_STYLE =
  /^(color|background-color|text-align|list-style-type|font-size|font-weight|text-decoration|margin|padding)$/;
const SAFE_URL = /^(https?:|mailto:|tel:|data:image\/|data:video\/|data:application\/|data:text\/|#|\/)/i;

/** Plain text of a rich value, collapsed to one line. */
export function stripHtml(value) {
  if (!value) return "";
  const s = String(value);
  if (!/[<&]/.test(s)) return s;
  const el = document.createElement("div");
  el.innerHTML = s;
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

/** True when the value carries markup rather than being plain text. */
export function isRich(value) {
  return !!value && /<[a-z][\s\S]*>/i.test(String(value));
}

/** The value with only editor-produced markup left in it. */
export function sanitizeHtml(value) {
  if (!value) return "";
  const s = String(value);
  if (!/[<]/.test(s)) return s;
  const root = document.createElement("div");
  root.innerHTML = s;

  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) continue; // text
      if (child.nodeType !== 1 || !ALLOWED_TAGS.has(child.tagName)) {
        // keep the words, drop the element
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        child.remove();
        continue;
      }
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase();
        if (!ALLOWED_ATTRS.has(name) || name.startsWith("on")) {
          child.removeAttribute(attr.name);
          continue;
        }
        if ((name === "src" || name === "href") && !SAFE_URL.test(attr.value.trim())) {
          child.removeAttribute(attr.name);
          continue;
        }
        if (name === "style") {
          const kept = attr.value
            .split(";")
            .map((d) => d.trim())
            .filter((d) => d && ALLOWED_STYLE.test(d.split(":")[0].trim().toLowerCase()))
            .join("; ");
          if (kept) child.setAttribute("style", kept);
          else child.removeAttribute("style");
        }
      }
      if (child.tagName === "A") child.setAttribute("rel", "noopener noreferrer");
      walk(child);
    }
  };
  walk(root);
  return root.innerHTML;
}
