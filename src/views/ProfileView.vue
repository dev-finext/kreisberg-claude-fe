<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useBoqStore } from "@/stores/boq";
import { useUiStore, SUPPRESSIBLE_PROMPTS, NOTIFICATION_EVENTS, DIGEST_OPTIONS } from "@/stores/ui";
import PageHeader from "@/components/layout/PageHeader.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseToggle from "@/components/shared/BaseToggle.vue";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal.vue";
import { formatDate, formatDateTime } from "@/utils/format";
import { stripHtml } from "@/utils/html";

const router = useRouter();
const db = useDbStore();
const ui = useUiStore();
const boq = useBoqStore();

const user = computed(() => db.currentUser);

/* ---------- פרטים אישיים ----------
   The system identifies a person by their full name — it is what every comment,
   history line and project author is matched against — so the two fields are
   edited separately and written back as one name. The mail address is the
   account itself and is not edited here. */
const editing = ref(false);
const draft = reactive({ firstName: "", lastName: "", title: "", role: "", phone: "" });
function splitName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/);
  return { firstName: parts.shift() || "", lastName: parts.join(" ") };
}
function startEdit() {
  const { firstName, lastName } = splitName(user.value.name);
  Object.assign(draft, {
    firstName,
    lastName,
    title: user.value.title || "",
    role: user.value.role || "",
    phone: user.value.phone || "",
  });
  editing.value = true;
}
function saveDetails() {
  const name = `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();
  if (!draft.firstName.trim()) {
    ui.toast("נא להזין שם פרטי", "error");
    return;
  }
  const live = db.db.users.find((u) => u.id === user.value.id);
  Object.assign(live, {
    name,
    title: draft.title.trim(),
    role: draft.role.trim(),
    phone: draft.phone.trim(),
  });
  db.persist();
  editing.value = false;
  ui.toast("הפרטים עודכנו בהצלחה");
}
const nameParts = computed(() => splitName(user.value.name));

const initials = computed(() =>
  (user.value.name || "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
);

/* ---------- החלפת משתמש ---------- */
function switchTo(id) {
  if (id === db.db.currentUserId) return;
  db.db.currentUserId = id;
  db.persist();
  ui.toast(`התחברת כ${db.currentUser.name}`);
}

/* ---------- הודעות ואישורים ---------- */
const prompts = SUPPRESSIBLE_PROMPTS;
const silencedCount = computed(() => prompts.filter((p) => ui.prefs[p.key]).length);
function setPrompt(key, shown) {
  ui.setPref(key, !shown);
  ui.toast(shown ? "ההודעה תוצג שוב" : "ההודעה לא תוצג יותר");
}
function restoreAllPrompts() {
  for (const p of prompts) ui.setPref(p.key, false);
  ui.toast("כל ההודעות יוצגו שוב");
}

/* ---------- העדפות תצוגה ---------- */
const railExpanded = computed({
  get: () => ui.prefs.railExpanded,
  set: (v) => ui.setPref("railExpanded", v),
});

/* ---------- הפעילות שלי ---------- */
const myProjects = computed(() => db.projects.filter((p) => p.author === user.value.name));
const myNotes = computed(() =>
  db.comments
    .filter((c) => c.author === user.value.name)
    .slice()
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .slice(0, 6)
);
const myHistory = computed(() =>
  db.db.history
    .filter((h) => h.user === user.value.name)
    .slice()
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .slice(0, 6)
);
function noteScope(c) {
  if (c.scope === "chapter") return "פרק";
  if (c.scope === "subChapter") return "תת פרק";
  return "סעיף";
}

/* ---------- אבטחה וגישה ---------- */
const MIN_PASSWORD = 8;
const changingPassword = ref(false);
const pw = reactive({ current: "", next: "", confirm: "" });
const pwError = computed(() => {
  if (!pw.current) return "יש להזין את הסיסמה הנוכחית";
  if (pw.next.length < MIN_PASSWORD) return `הסיסמה החדשה צריכה להכיל לפחות ${MIN_PASSWORD} תווים`;
  if (pw.next === pw.current) return "הסיסמה החדשה זהה לנוכחית";
  if (pw.next !== pw.confirm) return "אימות הסיסמה אינו תואם";
  return "";
});
function openPasswordForm() {
  Object.assign(pw, { current: "", next: "", confirm: "" });
  changingPassword.value = true;
}
function savePassword() {
  if (pwError.value) {
    ui.toast(pwError.value, "error");
    return;
  }
  const live = db.db.users.find((u) => u.id === user.value.id);
  live.passwordUpdatedAt = new Date().toISOString();
  db.persist();
  Object.assign(pw, { current: "", next: "", confirm: "" });
  changingPassword.value = false;
  ui.toast("הסיסמה עודכנה בהצלחה");
}

const confirmLogout = ref(false);
function logout() {
  confirmLogout.value = false;
  /* the demo has no login screen, so signing out drops what belongs to the
     session — the clipboard, the selections and the filters — and starts over */
  ui.clearClipboard();
  boq.$reset();
  ui.toast("התנתקת מהמערכת");
  router.push("/projects");
}

/* ---------- התראות ודוא"ל ---------- */
const notificationEvents = NOTIFICATION_EVENTS;
const digestOptions = DIGEST_OPTIONS;
const digest = computed({
  get: () => ui.prefs.digest,
  set: (v) => ui.setPref("digest", v),
});
function setNotify(key, v) {
  ui.setPref(key, v);
}

/* ---------- נתוני הדמו ---------- */
const confirmReset = ref(false);
function resetDemo() {
  confirmReset.value = false;
  db.resetDemo();
  ui.toast("נתוני הדמו אופסו");
  router.push("/projects");
}
</script>

<template>
  <div>
    <PageHeader title="הפרופיל שלי" :crumbs="['משתמש']">
      <template #actions>
        <button v-if="!editing" class="btn btn-secondary" @click="startEdit">עריכת פרטים</button>
        <template v-else>
          <button class="btn btn-primary" @click="saveDetails">שמירה</button>
          <button class="btn btn-secondary" @click="editing = false">ביטול</button>
        </template>
      </template>
    </PageHeader>

    <div class="profile-grid">
      <!-- ===== פרטים אישיים ===== -->
      <section class="card identity">
        <div class="id-head">
          <span class="avatar">{{ initials }}</span>
          <div class="id-main">
            <h2 class="id-name">{{ user.name }}</h2>
            <p class="id-title">{{ user.title || user.role }}</p>
            <span class="pill pill-info">{{ user.role }}</span>
          </div>
        </div>

        <dl v-if="!editing" class="fields">
          <div class="field-line">
            <dt>שם פרטי</dt>
            <dd>{{ nameParts.firstName || "—" }}</dd>
          </div>
          <div class="field-line">
            <dt>שם משפחה</dt>
            <dd>{{ nameParts.lastName || "—" }}</dd>
          </div>
          <div class="field-line">
            <dt>תפקיד</dt>
            <dd>{{ user.title || "—" }}</dd>
          </div>
          <div class="field-line">
            <dt>הרשאה</dt>
            <dd>{{ user.role }}</dd>
          </div>
          <div class="field-line">
            <dt>דוא"ל</dt>
            <dd class="ltr">{{ user.email || "—" }}</dd>
          </div>
          <div class="field-line">
            <dt>טלפון</dt>
            <dd class="num">{{ user.phone || "—" }}</dd>
          </div>
          <div class="field-line">
            <dt>הצטרף בתאריך</dt>
            <dd class="num">{{ user.joinedAt ? formatDate(user.joinedAt) : "—" }}</dd>
          </div>
        </dl>

        <div v-else class="fields">
          <label class="field-line">
            <span class="lbl">שם פרטי</span>
            <input v-model="draft.firstName" class="input" />
          </label>
          <label class="field-line">
            <span class="lbl">שם משפחה</span>
            <input v-model="draft.lastName" class="input" />
          </label>
          <label class="field-line">
            <span class="lbl">תפקיד</span>
            <input v-model="draft.title" class="input" />
          </label>
          <label class="field-line">
            <span class="lbl">הרשאה</span>
            <input v-model="draft.role" class="input" />
          </label>
          <div class="field-line">
            <span class="lbl">דוא"ל</span>
            <span class="read-only ltr">{{ user.email || "—" }}</span>
          </div>
          <label class="field-line">
            <span class="lbl">טלפון</span>
            <input v-model="draft.phone" class="input num" />
          </label>
          <p class="read-only-note">
            כתובת הדוא"ל משמשת להתחברות ולזיהוי החשבון, ואינה ניתנת לעריכה מכאן. לשינויה יש לפנות למנהל
            המערכת.
          </p>
        </div>
      </section>

      <!-- ===== הודעות ואישורים ===== -->
      <section class="card">
        <header class="sec-head">
          <h3 class="sec-title">הודעות ואישורים</h3>
          <button v-if="silencedCount" class="btn-text" @click="restoreAllPrompts">הפעלת הכל</button>
        </header>
        <p class="sec-note">
          חלק מהפעולות מציגות הודעת אישור לפני ביצוען. אם סימנת בהודעה “אל תציג הודעה זו שוב”, היא הפסיקה
          להופיע — וניתן להחזיר אותה לכאן בכל עת. הבחירה הפיכה לחלוטין ואינה משפיעה על הנתונים.
        </p>
        <div v-for="p in prompts" :key="p.key" class="pref-line">
          <div class="pref-text">
            <span class="pref-label">{{ p.label }}</span>
            <span class="pref-detail">{{ p.detail }}</span>
          </div>
          <BaseToggle :model-value="!ui.prefs[p.key]" @update:model-value="(v) => setPrompt(p.key, v)" />
        </div>
      </section>

      <!-- ===== העדפות תצוגה ===== -->
      <section class="card">
        <header class="sec-head"><h3 class="sec-title">העדפות תצוגה</h3></header>
        <div class="pref-line">
          <div class="pref-text">
            <span class="pref-label">תפריט צד פתוח</span>
            <span class="pref-detail">תפריט הניווט נפתח עם שמות המסכים ולא רק עם האייקונים.</span>
          </div>
          <BaseToggle v-model="railExpanded" />
        </div>
      </section>

      <!-- ===== החלפת משתמש ===== -->
      <section class="card">
        <header class="sec-head"><h3 class="sec-title">משתמשי הדמו</h3></header>
        <p class="sec-note">הדמו כולל שלושה משתמשים. המשתמש הפעיל הוא זה שנרשם כמחבר על כל פעולה.</p>
        <button
          v-for="u in db.db.users"
          :key="u.id"
          class="user-line"
          :class="{ active: u.id === db.db.currentUserId }"
          @click="switchTo(u.id)"
        >
          <span class="avatar small">{{ (u.name || "").slice(0, 1) }}</span>
          <span class="u-main">
            <span class="u-name">{{ u.name }}</span>
            <span class="u-role">{{ u.title || u.role }}</span>
          </span>
          <AppIcon v-if="u.id === db.db.currentUserId" name="check-circle" :size="18" />
        </button>
      </section>

      <!-- ===== הפעילות שלי ===== -->
      <section class="card wide">
        <header class="sec-head"><h3 class="sec-title">הפעילות שלי</h3></header>
        <div class="activity">
          <div class="act-col">
            <h4 class="act-title">פרויקטים באחריותי ({{ myProjects.length }})</h4>
            <button
              v-for="p in myProjects.slice(0, 6)"
              :key="p.id"
              class="act-line"
              @click="router.push(`/projects/${p.id}`)"
            >
              <span class="act-main">{{ p.name }}</span>
              <span class="act-meta">{{ p.location }}</span>
            </button>
            <p v-if="!myProjects.length" class="act-empty">אין פרויקטים רשומים על שמך</p>
          </div>

          <div class="act-col">
            <h4 class="act-title">ההערות האחרונות שלי</h4>
            <div v-for="c in myNotes" :key="c.id" class="act-line static">
              <span class="act-main">{{ stripHtml(c.text) }}</span>
              <span class="act-meta">{{ noteScope(c) }} · {{ formatDateTime(c.ts) }}</span>
            </div>
            <p v-if="!myNotes.length" class="act-empty">עדיין לא כתבת הערות</p>
          </div>

          <div class="act-col">
            <h4 class="act-title">שינויים אחרונים</h4>
            <div v-for="h in myHistory" :key="h.id" class="act-line static">
              <span class="act-main">{{ h.changes.length }} שדות עודכנו</span>
              <span class="act-meta">{{ formatDateTime(h.ts) }}</span>
            </div>
            <p v-if="!myHistory.length" class="act-empty">אין שינויים רשומים</p>
          </div>
        </div>
      </section>

      <!-- ===== אבטחה וגישה ===== -->
      <section class="card">
        <header class="sec-head"><h3 class="sec-title">אבטחה וגישה</h3></header>

        <div v-if="!changingPassword" class="pref-line first">
          <div class="pref-text">
            <span class="pref-label">סיסמה</span>
            <span class="pref-detail">
              {{
                user.passwordUpdatedAt
                  ? `עודכנה לאחרונה ב-${formatDateTime(user.passwordUpdatedAt)}`
                  : "לא עודכנה מאז יצירת החשבון"
              }}
            </span>
          </div>
          <button class="btn btn-secondary" @click="openPasswordForm">החלפת סיסמה</button>
        </div>

        <form v-else class="pw-form" @submit.prevent="savePassword">
          <label class="field-line">
            <span class="lbl">סיסמה נוכחית</span>
            <input v-model="pw.current" type="password" autocomplete="current-password" class="input" />
          </label>
          <label class="field-line">
            <span class="lbl">סיסמה חדשה</span>
            <input v-model="pw.next" type="password" autocomplete="new-password" class="input" />
          </label>
          <label class="field-line">
            <span class="lbl">אימות סיסמה</span>
            <input v-model="pw.confirm" type="password" autocomplete="new-password" class="input" />
          </label>
          <p class="pw-hint" :class="{ error: pwError && pw.current }">
            {{ pwError && pw.current ? pwError : `לפחות ${MIN_PASSWORD} תווים, ושונה מהסיסמה הנוכחית` }}
          </p>
          <div class="pw-actions">
            <button class="btn btn-primary" type="submit" :disabled="!!pwError">עדכון סיסמה</button>
            <button class="btn btn-secondary" type="button" @click="changingPassword = false">ביטול</button>
          </div>
        </form>

        <div class="pref-line">
          <div class="pref-text">
            <span class="pref-label">התנתקות</span>
            <span class="pref-detail">
              סגירת הסשן הנוכחי. הבחירות הפתוחות בכתבי הכמויות והלוח הזמני ייסגרו; הנתונים עצמם נשמרים.
            </span>
          </div>
          <button class="btn btn-secondary" @click="confirmLogout = true">התנתקות</button>
        </div>
      </section>

      <!-- ===== התראות ודוא"ל ===== -->
      <section class="card">
        <header class="sec-head"><h3 class="sec-title">התראות ודוא"ל</h3></header>
        <p class="sec-note">
          ההתראות נשלחות ל-<span class="ltr">{{ user.email || "—" }}</span
          >. בגרסת הדמו ההעדפות נשמרות אך לא נשלח דואר בפועל.
        </p>
        <div v-for="e in notificationEvents" :key="e.key" class="pref-line">
          <div class="pref-text">
            <span class="pref-label">{{ e.label }}</span>
            <span class="pref-detail">{{ e.detail }}</span>
          </div>
          <BaseToggle :model-value="ui.prefs[e.key]" @update:model-value="(v) => setNotify(e.key, v)" />
        </div>
        <div class="pref-line">
          <div class="pref-text">
            <span class="pref-label">סיכום מרוכז</span>
            <span class="pref-detail">במקום הודעה על כל אירוע, דואר אחד מרוכז בתדירות שתיבחר.</span>
          </div>
          <select v-model="digest" class="select digest-select">
            <option v-for="o in digestOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
      </section>

      <!-- ===== נתוני הדמו ===== -->
      <section class="card wide danger-card">
        <header class="sec-head"><h3 class="sec-title">נתוני הדמו</h3></header>
        <div class="pref-line">
          <div class="pref-text">
            <span class="pref-label">איפוס נתוני הדמו</span>
            <span class="pref-detail">
              כל הפרויקטים, כתבי הכמויות, הקטלוג וההעדפות יחזרו למצבם ההתחלתי. הפעולה אינה הפיכה.
            </span>
          </div>
          <button class="btn btn-secondary danger-btn" @click="confirmReset = true">איפוס</button>
        </div>
      </section>
    </div>

    <DeleteConfirmModal
      v-if="confirmLogout"
      title="התנתקות"
      message="להתנתק מהמערכת?"
      detail="הסשן ייסגר ותוחזר למסך הפתיחה. הנתונים שלך נשמרים."
      confirm-label="התנתקות"
      @close="confirmLogout = false"
      @confirm="logout"
    />
    <DeleteConfirmModal
      v-if="confirmReset"
      title="איפוס נתוני הדמו"
      message="האם לאפס את נתוני הדמו?"
      detail="כל השינויים שבוצעו בדמו יימחקו והנתונים יוחזרו למצבם ההתחלתי"
      confirm-label="איפוס"
      @close="confirmReset = false"
      @confirm="resetDemo"
    />
  </div>
</template>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  align-items: start;
}
.card {
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: 20px 24px;
}
.wide {
  grid-column: 1 / -1;
}
/* ---- identity ---- */
.id-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--divider);
}
.avatar {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.avatar.small {
  width: 32px;
  height: 32px;
  font-size: 14px;
}
.id-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.id-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
.id-title {
  font-size: 13px;
  color: var(--text-secondary);
}
.fields {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 12px;
}
.field-line {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  font-size: 14px;
}
.field-line dt,
.field-line .lbl {
  width: 110px;
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 13px;
}
.field-line dd {
  color: var(--text-primary);
}
.field-line .input {
  flex: 1;
  min-width: 0;
}
.ltr {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: right;
}
/* the mail address is the account itself — shown, never edited from here */
.read-only {
  flex: 1;
  min-width: 0;
  color: var(--text-secondary);
}
.read-only-note {
  font-size: 12px;
  color: var(--text-muted);
  padding-top: 4px;
}
/* ---- sections ---- */
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.sec-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.sec-note {
  font-size: 13px;
  line-height: 18px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
.pref-line {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px solid var(--divider);
}
.pref-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pref-label {
  font-size: 14px;
  color: var(--text-primary);
}
.pref-detail {
  font-size: 12px;
  line-height: 16px;
  color: var(--text-secondary);
}
/* ---- users ---- */
.user-line {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--brand-primary);
  text-align: right;
  cursor: pointer;
}
.user-line:hover {
  background: var(--surface-subtle);
}
.user-line.active {
  background: var(--brand-primary-soft);
}
.u-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.u-name {
  font-size: 14px;
  color: var(--text-primary);
}
.u-role {
  font-size: 12px;
  color: var(--text-secondary);
}
/* ---- activity ---- */
.activity {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}
.act-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.act-line {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: 6px;
  background: none;
  text-align: right;
  cursor: pointer;
}
.act-line.static {
  cursor: default;
}
.act-line:not(.static):hover {
  background: var(--surface-subtle);
}
.act-main {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.act-meta {
  font-size: 11px;
  color: var(--text-muted);
}
.act-empty {
  font-size: 13px;
  color: var(--text-muted);
  padding: 6px 8px;
}
/* ---- security ---- */
.pref-line.first {
  border-top: none;
  padding-top: 0;
}
.pw-form {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 12px;
}
.pw-hint {
  font-size: 12px;
  line-height: 16px;
  color: var(--text-muted);
  padding: 2px 0 8px;
}
.pw-hint.error {
  color: var(--danger);
}
.pw-actions {
  display: flex;
  gap: 10px;
  flex-direction: row-reverse;
  justify-content: flex-start;
}
.digest-select {
  width: 140px;
  flex-shrink: 0;
}
/* ---- demo data ---- */
.danger-card .pref-line {
  border-top: none;
  padding: 0;
}
.danger-btn {
  color: var(--danger);
  border-color: var(--danger);
}
</style>
