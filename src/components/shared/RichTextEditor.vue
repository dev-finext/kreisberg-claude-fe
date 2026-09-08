<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";

/**
 * Rich-text editor drawn to the Figma "rich text" toolbar: 19 controls at 24px,
 * 14px apart, centred over a #BBC5CF hairline. Every control does something —
 * nothing here is decorative.
 */
const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  minHeight: { type: String, default: "104px" },
});
const emit = defineEmits(["update:modelValue"]);

const body = ref(null);
const popover = ref(null); // 'fore' | 'back' | 'emoji' | 'align' | 'ol' | 'ul'
const marks = ref(false); // ¶ — show formatting marks
const canUndo = ref(false);
const canRedo = ref(false);
const active = ref({});

const TEXT_COLORS = ["#323D56", "#5B93EF", "#315583", "#70869E", "#F26363", "#2FA36B", "#8060DD", "#000000"];
const BACK_COLORS = [
  "#F6F9FD",
  "#E8EDF5",
  "#F4F4F4",
  "#FFF4C7",
  "#FFE0E0",
  "#DFF5E8",
  "#EEEEFC",
  "transparent",
];
const EMOJI = ["🙂", "👍", "✅", "⚠️", "❗", "📌", "🔧", "🧱", "📐", "🚧", "💡", "📎"];
const ALIGN = [
  { cmd: "justifyRight", label: "יישור לימין" },
  { cmd: "justifyCenter", label: "מרכוז" },
  { cmd: "justifyLeft", label: "יישור לשמאל" },
  { cmd: "justifyFull", label: "יישור לשני הצדדים" },
];
const OL_STYLES = [
  { v: "decimal", label: "1. 2. 3." },
  { v: "hebrew", label: "א. ב. ג." },
  { v: "upper-roman", label: "I. II. III." },
];
const UL_STYLES = [
  { v: "disc", label: "● עיגול מלא" },
  { v: "circle", label: "○ עיגול" },
  { v: "square", label: "▪ ריבוע" },
];

/* the editor owns the DOM, so the model is pushed in only when it differs */
function syncIn() {
  if (body.value && body.value.innerHTML !== (props.modelValue || "")) {
    body.value.innerHTML = props.modelValue || "";
  }
}
onMounted(syncIn);
watch(() => props.modelValue, syncIn);

const isEmpty = computed(() => !props.modelValue || props.modelValue === "<br>");

function focusBody() {
  body.value?.focus();
}
function emitChange() {
  const html = body.value?.innerHTML ?? "";
  emit("update:modelValue", html === "<br>" ? "" : html);
  refreshState();
}
function refreshState() {
  const st = {};
  for (const c of [
    "bold",
    "italic",
    "underline",
    "strikeThrough",
    "insertOrderedList",
    "insertUnorderedList",
  ]) {
    try {
      st[c] = document.queryCommandState(c);
    } catch {
      st[c] = false;
    }
  }
  active.value = st;
}
function run(cmd, value = null) {
  focusBody();
  document.execCommand(cmd, false, value);
  canUndo.value = true;
  popover.value = null;
  emitChange();
}
function toggle(name) {
  popover.value = popover.value === name ? null : name;
}

/* lists keep their marker style on the list element itself */
function applyList(cmd, style) {
  focusBody();
  document.execCommand(cmd, false, null);
  const sel = window.getSelection();
  let node = sel?.anchorNode;
  while (node && node !== body.value && !(node.nodeName === "OL" || node.nodeName === "UL"))
    node = node.parentNode;
  if (node && node !== body.value) node.style.listStyleType = style;
  canUndo.value = true;
  popover.value = null;
  emitChange();
}

function insertHtml(html) {
  focusBody();
  document.execCommand("insertHTML", false, html);
  canUndo.value = true;
  emitChange();
}

/* ---------- media / attachments ---------- */
const fileInput = ref(null);
const pendingKind = ref(null); // 'image' | 'attach' | 'doc' | 'video'
const ACCEPT = {
  image: "image/*",
  attach: "*/*",
  doc: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt",
  video: "video/*",
};
function pickFile(kind) {
  pendingKind.value = kind;
  popover.value = null;
  nextTick(() => fileInput.value?.click());
}
function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function onFile(e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  const kind = pendingKind.value;
  const reader = new FileReader();
  reader.onload = () => {
    const src = reader.result;
    const name = escapeHtml(file.name);
    if (kind === "image") insertHtml(`<img src="${src}" alt="${name}" />`);
    else if (kind === "video") insertHtml(`<video src="${src}" controls></video>`);
    else if (kind === "attach")
      insertHtml(
        `<a class="rte-chip" href="${src}" download="${name}" title="${name}">📎 ${name} · ${humanSize(file.size)}</a>&nbsp;`
      );
    else
      insertHtml(
        `<a class="rte-doc" href="${src}" download="${name}" title="${name}"><span class="rte-doc-name">${name}</span><span class="rte-doc-size">${humanSize(file.size)}</span></a>`
      );
  };
  reader.readAsDataURL(file);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/* ---------- undo / redo ---------- */
function undo() {
  focusBody();
  document.execCommand("undo");
  canRedo.value = true;
  emitChange();
}
function redo() {
  focusBody();
  document.execCommand("redo");
  emitChange();
}

/* outdent only makes sense inside an indented block or a list */
const canOutdent = computed(() => {
  void active.value;
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  let node = sel?.anchorNode;
  while (node && node !== body.value) {
    if (node.nodeName === "BLOCKQUOTE" || node.nodeName === "LI") return true;
    node = node.parentNode;
  }
  return false;
});

function onInput() {
  canUndo.value = true;
  emitChange();
}
function onPaste(e) {
  /* paste as plain text so foreign markup never lands in the document */
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text/plain");
  document.execCommand("insertText", false, text);
}
</script>

<template>
  <div class="rte" :class="{ marks }" @click="popover = null">
    <div class="rte-toolbar" @click.stop>
      <button class="rt" :class="{ on: active.bold }" title="מודגש" @click="run('bold')">
        <AppIcon name="rt-bold" :size="24" />
      </button>
      <button class="rt" :class="{ on: active.italic }" title="נטוי" @click="run('italic')">
        <AppIcon name="rt-italic" :size="24" />
      </button>
      <button class="rt" :class="{ on: active.underline }" title="קו תחתון" @click="run('underline')">
        <AppIcon name="rt-underline" :size="24" />
      </button>
      <button class="rt" :class="{ on: active.strikeThrough }" title="קו חוצה" @click="run('strikeThrough')">
        <AppIcon name="rt-strike" :size="24" />
      </button>

      <span class="rt-wrap">
        <button class="rt" :class="{ on: popover === 'fore' }" title="צבע טקסט" @click.stop="toggle('fore')">
          <AppIcon name="rt-text-color" :size="24" />
        </button>
        <span v-if="popover === 'fore'" class="rt-pop swatches" @click.stop>
          <button
            v-for="c in TEXT_COLORS"
            :key="c"
            class="sw"
            :style="{ background: c }"
            :title="c"
            @click="run('foreColor', c)"
          />
        </span>
      </span>

      <span class="rt-wrap">
        <button class="rt" :class="{ on: popover === 'back' }" title="צבע הדגשה" @click.stop="toggle('back')">
          <AppIcon name="rt-fill" :size="24" />
        </button>
        <span v-if="popover === 'back'" class="rt-pop swatches" @click.stop>
          <button
            v-for="c in BACK_COLORS"
            :key="c"
            class="sw"
            :class="{ none: c === 'transparent' }"
            :style="{ background: c }"
            :title="c === 'transparent' ? 'ללא' : c"
            @click="run('hiliteColor', c)"
          />
        </span>
      </span>

      <span class="rt-wrap">
        <button class="rt" :class="{ on: popover === 'emoji' }" title="אימוג׳י" @click.stop="toggle('emoji')">
          <AppIcon name="rt-emoji" :size="24" />
        </button>
        <span v-if="popover === 'emoji'" class="rt-pop emojis" @click.stop>
          <button v-for="e in EMOJI" :key="e" class="em" @click="run('insertText', e)">{{ e }}</button>
        </span>
      </span>

      <button class="rt" :class="{ on: marks }" title="הצגת סימני עיצוב" @click="marks = !marks">
        <AppIcon name="rt-pilcrow" :size="24" />
      </button>

      <span class="rt-wrap">
        <button class="rt" :class="{ on: popover === 'align' }" title="יישור" @click.stop="toggle('align')">
          <AppIcon name="rt-align" :size="24" />
        </button>
        <span v-if="popover === 'align'" class="rt-pop menu" @click.stop>
          <button v-for="a in ALIGN" :key="a.cmd" class="mi" @click="run(a.cmd)">{{ a.label }}</button>
        </span>
      </span>

      <span class="rt-wrap">
        <button
          class="rt"
          :class="{ on: popover === 'ol' || active.insertOrderedList }"
          title="רשימה ממוספרת"
          @click.stop="toggle('ol')"
        >
          <AppIcon name="rt-ol" :size="24" />
        </button>
        <span v-if="popover === 'ol'" class="rt-pop menu" @click.stop>
          <button v-for="s in OL_STYLES" :key="s.v" class="mi" @click="applyList('insertOrderedList', s.v)">
            {{ s.label }}
          </button>
        </span>
      </span>

      <span class="rt-wrap">
        <button
          class="rt"
          :class="{ on: popover === 'ul' || active.insertUnorderedList }"
          title="רשימת תבליטים"
          @click.stop="toggle('ul')"
        >
          <AppIcon name="rt-ul" :size="24" />
        </button>
        <span v-if="popover === 'ul'" class="rt-pop menu" @click.stop>
          <button v-for="s in UL_STYLES" :key="s.v" class="mi" @click="applyList('insertUnorderedList', s.v)">
            {{ s.label }}
          </button>
        </span>
      </span>

      <button class="rt" title="הגדלת כניסה" @click="run('indent')">
        <AppIcon name="rt-indent" :size="24" />
      </button>
      <button class="rt" :disabled="!canOutdent" title="הקטנת כניסה" @click="run('outdent')">
        <AppIcon name="rt-outdent" :size="24" />
      </button>

      <button class="rt" title="הוספת תמונה" @click="pickFile('image')">
        <AppIcon name="rt-image" :size="24" />
      </button>
      <button class="rt" title="צירוף קובץ" @click="pickFile('attach')">
        <AppIcon name="rt-clip" :size="24" />
      </button>
      <button class="rt" title="הטמעת מסמך" @click="pickFile('doc')">
        <AppIcon name="rt-file" :size="24" />
      </button>
      <button class="rt" title="הוספת וידאו" @click="pickFile('video')">
        <AppIcon name="rt-video" :size="24" />
      </button>

      <button class="rt" :disabled="!canUndo" title="ביטול פעולה" @click="undo">
        <AppIcon name="rt-undo" :size="24" />
      </button>
      <button class="rt" :disabled="!canRedo" title="ביצוע מחדש" @click="redo">
        <AppIcon name="rt-redo" :size="24" />
      </button>
    </div>

    <div
      ref="body"
      class="rte-body scroll-slim"
      :class="{ empty: isEmpty }"
      :style="{ minHeight }"
      contenteditable="true"
      :data-placeholder="placeholder"
      @input="onInput"
      @paste="onPaste"
      @keyup="refreshState"
      @mouseup="refreshState"
      @blur="emitChange"
    />
    <input
      ref="fileInput"
      type="file"
      class="rte-file"
      :accept="pendingKind ? ACCEPT[pendingKind] : '*/*'"
      @change="onFile"
    />
  </div>
</template>

<style scoped>
.rte {
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  background: var(--surface);
  overflow: hidden;
}
/* Figma "rich text": 24px glyphs, 14px apart, centred, over a hairline */
.rte-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-strong);
}
.rt {
  position: relative;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--text-secondary);
}
.rt:hover:not(:disabled) {
  background: var(--surface-muted);
}
.rt.on {
  color: var(--brand-primary);
  background: var(--brand-primary-soft);
}
.rt:disabled {
  color: var(--border-strong);
  cursor: default;
}
.rt-wrap {
  position: relative;
  display: inline-flex;
}
.rt-pop {
  position: absolute;
  top: 30px;
  right: 50%;
  transform: translateX(50%);
  z-index: 20;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(16, 37, 86, 0.16);
  padding: 8px;
  display: flex;
}
.swatches,
.emojis {
  display: grid;
  grid-template-columns: repeat(4, 20px);
  gap: 6px;
}
.sw {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid var(--border-strong);
  padding: 0;
}
.sw.none {
  background:
    linear-gradient(45deg, transparent 45%, var(--danger) 45%, var(--danger) 55%, transparent 55%),
    var(--surface);
}
.emojis {
  grid-template-columns: repeat(4, 24px);
}
.em {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  border-radius: 4px;
  font-size: 15px;
  line-height: 1;
  padding: 0;
}
.em:hover {
  background: var(--surface-muted);
}
.menu {
  flex-direction: column;
  gap: 2px;
  min-width: 148px;
  padding: 4px;
}
.mi {
  border: none;
  background: none;
  border-radius: 4px;
  height: 28px;
  padding: 0 8px;
  font-family: inherit;
  font-size: 13px;
  color: var(--text-primary);
  text-align: right;
  white-space: nowrap;
}
.mi:hover {
  background: var(--brand-primary-soft);
}
.rte-body {
  padding: 13px 16px 16px;
  font-size: 14px;
  line-height: 20px;
  color: var(--text-primary);
  text-align: right;
  outline: none;
  overflow-y: auto;
  max-height: 340px;
}
.rte-body.empty::before {
  content: attr(data-placeholder);
  color: var(--text-disabled);
  pointer-events: none;
}
.rte-body :deep(ul),
.rte-body :deep(ol) {
  padding-right: 24px;
  margin: 4px 0;
}
.rte-body :deep(blockquote) {
  margin: 4px 24px 4px 0;
  padding-right: 12px;
  border-right: 2px solid var(--border-strong);
}
.rte-body :deep(img),
.rte-body :deep(video) {
  max-width: 100%;
  border-radius: 6px;
  margin: 4px 0;
}
.rte-body :deep(.rte-chip) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-muted);
  border: 1px solid var(--border-strong);
  border-radius: 100px;
  padding: 2px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  text-decoration: none;
}
.rte-body :deep(.rte-doc) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 10px 12px;
  margin: 6px 0;
  font-size: 13px;
  color: var(--text-primary);
  text-decoration: none;
}
.rte-body :deep(.rte-doc-size) {
  color: var(--text-secondary);
  font-size: 12px;
}
/* ¶ — formatting marks */
.rte.marks .rte-body :deep(p)::after,
.rte.marks .rte-body :deep(div)::after {
  content: "¶";
  color: var(--border-strong);
  margin-right: 2px;
}
.rte-file {
  display: none;
}
</style>
