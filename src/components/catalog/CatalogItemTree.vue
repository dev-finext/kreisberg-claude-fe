<script setup>
import { ref, computed } from "vue";
import { useCatalogStore } from "@/stores/catalog";
import AppIcon from "@/components/shared/AppIcon.vue";
import BaseCheckbox from "@/components/shared/BaseCheckbox.vue";

/**
 * Catalog sections grouped the way the design draws them in the open row:
 * פרק › תת פרק › סעיף, with the section line reading name, code and unit.
 * Alternatives are pickable, so those rows carry a checkbox.
 */
const props = defineProps({
  /** catalog item objects to lay out */
  items: { type: Array, default: () => [] },
  /** show a checkbox on every row */
  selectable: { type: Boolean, default: false },
  /** ids ticked, when selectable */
  modelValue: { type: Array, default: () => [] },
  empty: { type: String, default: "אין סעיפים להצגה" },
});
const emit = defineEmits(["update:modelValue", "pick"]);

const cat = useCatalogStore();
const collapsed = ref([]);

const groups = computed(() => {
  const byChapter = new Map();
  for (const it of props.items) {
    if (!it) continue;
    const sc = cat.subChapter(it.subChapterId);
    const ch = cat.chapter(it.chapterId ?? sc?.chapterId);
    if (!ch || !sc) continue;
    if (!byChapter.has(ch.id)) byChapter.set(ch.id, { chapter: ch, subs: new Map() });
    const g = byChapter.get(ch.id);
    if (!g.subs.has(sc.id)) g.subs.set(sc.id, { sub: sc, items: [] });
    g.subs.get(sc.id).items.push(it);
  }
  return [...byChapter.values()].map((g) => ({ ...g, subs: [...g.subs.values()] }));
});

function isOpen(key) {
  return !collapsed.value.includes(key);
}
function toggle(key) {
  const i = collapsed.value.indexOf(key);
  if (i >= 0) collapsed.value.splice(i, 1);
  else collapsed.value.push(key);
}
function checked(id) {
  return props.modelValue.includes(id);
}
function setChecked(ids, v) {
  const next = v
    ? [...new Set([...props.modelValue, ...ids])]
    : props.modelValue.filter((id) => !ids.includes(id));
  emit("update:modelValue", next);
}
function groupIds(g) {
  return g.subs.flatMap((s) => s.items.map((i) => i.id));
}
function allChecked(ids) {
  return ids.length > 0 && ids.every((id) => props.modelValue.includes(id));
}
</script>

<template>
  <div class="cit">
    <template v-for="g in groups" :key="g.chapter.id">
      <div class="cit-row chapter">
        <span class="chev" @click="toggle(`c${g.chapter.id}`)">
          <AppIcon :name="isOpen(`c${g.chapter.id}`) ? 'chevron-down' : 'chevron-left'" :size="16" />
        </span>
        <BaseCheckbox
          v-if="selectable"
          size="small"
          :model-value="allChecked(groupIds(g))"
          @update:model-value="(v) => setChecked(groupIds(g), v)"
        />
        <span class="cit-label">פרק {{ g.chapter.num }}- {{ g.chapter.name }}</span>
      </div>

      <template v-if="isOpen(`c${g.chapter.id}`)">
        <template v-for="s in g.subs" :key="s.sub.id">
          <div class="cit-row sub">
            <span class="chev" @click="toggle(`s${s.sub.id}`)">
              <AppIcon :name="isOpen(`s${s.sub.id}`) ? 'chevron-down' : 'chevron-left'" :size="16" />
            </span>
            <BaseCheckbox
              v-if="selectable"
              size="small"
              :model-value="allChecked(s.items.map((i) => i.id))"
              @update:model-value="
                (v) =>
                  setChecked(
                    s.items.map((i) => i.id),
                    v
                  )
              "
            />
            <span class="cit-label">תת פרק {{ s.sub.num }}- {{ s.sub.name }}</span>
          </div>

          <div
            v-for="it in isOpen(`s${s.sub.id}`) ? s.items : []"
            :key="it.id"
            class="cit-row item"
            @click="emit('pick', it)"
          >
            <BaseCheckbox
              v-if="selectable"
              size="small"
              :model-value="checked(it.id)"
              @update:model-value="(v) => setChecked([it.id], v)"
            />
            <span class="cit-label ellipsis">{{ it.name }}</span>
            <span class="cit-code num">{{ it.code }}</span>
            <span class="cit-unit">({{ it.unit }})</span>
          </div>
        </template>
      </template>
    </template>
    <p v-if="!groups.length" class="cit-empty">{{ empty }}</p>
  </div>
</template>

<style scoped>
.cit {
  display: flex;
  flex-direction: column;
}
.cit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  font-size: 14px;
  line-height: 18px;
  color: var(--text-primary);
}
.cit-row.sub {
  padding-right: 20px;
}
.cit-row.item {
  padding-right: 40px;
}
.chev {
  display: inline-flex;
  color: var(--text-secondary);
  cursor: pointer;
}
.cit-label {
  min-width: 0;
}
.cit-code {
  color: var(--text-secondary);
}
.cit-unit {
  color: var(--text-secondary);
}
.cit-empty {
  font-size: 14px;
  color: var(--text-muted);
  padding: 4px 0;
}
</style>
