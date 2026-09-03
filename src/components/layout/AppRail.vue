<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";

const route = useRoute();
const router = useRouter();
const db = useDbStore();
const ui = useUiStore();

const expanded = computed({
  get: () => ui.railExpanded,
  set: (v) => (ui.railExpanded = v),
});
const systemOpen = ref(true);

const disabledMsg = () => ui.toast("מסך זה אינו זמין בדמו", "warning");

const isProjects = computed(() => route.path.startsWith("/projects"));
const isSystem = computed(() => route.path.startsWith("/system"));

const SYSTEM_ITEMS = [
  { key: "general", label: "כללי", to: null },
  { key: "resource-types", label: "סוגי משאבים", to: "/system/resource-types" },
  { key: "resource-library", label: "ספריית משאבים", to: "/system/resource-library" },
  { key: "indexes", label: "אינדקסים ומטבעות", to: null },
  { key: "catalogs", label: "קטלוגים", to: "/system/catalogs" },
  { key: "tags", label: "ניהול תגיות", to: "/system/tags" },
  { key: "mapping", label: "מיפוי כתב כמויות", to: "/system/mapping" },
  { key: "project-categories", label: "קטגוריות פרויקט", to: "/system/project-categories" },
  { key: "project-templates", label: "תבניות פרויקטים", to: "/system/project-templates" },
  { key: "security", label: "אבטחת מידע", to: null },
  { key: "clients", label: "ניהול לקוחות", to: null },
];

function goSystem(item) {
  if (!item.to) {
    disabledMsg();
    return;
  }
  router.push(item.to);
}
function toggleSystem() {
  if (!expanded.value) {
    expanded.value = true;
    systemOpen.value = true;
    return;
  }
  systemOpen.value = !systemOpen.value;
}
</script>

<template>
  <nav class="rail" :class="{ expanded }">
    <div class="rail-top">
      <button
        class="rail-collapse"
        :title="expanded ? 'כיווץ תפריט' : 'הרחבת תפריט'"
        @click="expanded = !expanded"
      >
        <AppIcon :name="expanded ? 'chevron-right' : 'chevron-left'" :size="22" />
      </button>

      <div class="rail-logo" :class="{ big: expanded }" title="KREISBERG">
        <svg v-if="!expanded" width="30" height="24" viewBox="0 0 30 24" fill="none">
          <path
            d="M4 2v20M4 12L16 2M4 12l12 10"
            stroke="#fff"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M20 5.5c4 0 7 2.9 7 6.5s-3 6.5-7 6.5c-1.6 0-3-.45-4.2-1.25"
            stroke="#fff"
            stroke-width="2.2"
            stroke-linecap="round"
          />
        </svg>
        <div v-else class="logo-word">
          KREISBER<span class="logo-g">g</span>
          <div class="logo-sub">When quantity meets quality</div>
        </div>
      </div>

      <div class="rail-menu">
        <!-- פרויקטים -->
        <button
          class="rail-item"
          :class="{ active: isProjects && !expanded, current: isProjects }"
          title="פרויקטים"
          @click="router.push('/projects')"
        >
          <span v-if="expanded" class="ri-label">פרויקטים</span>
          <span class="ri-icon" :class="{ boxed: expanded && isProjects }"
            ><AppIcon name="menu-projects" :size="20"
          /></span>
        </button>
        <!-- דו"חות -->
        <button class="rail-item disabled" title='דו"חות — לא זמין בדמו' @click="disabledMsg">
          <span v-if="expanded" class="ri-label">דו"חות</span>
          <span class="ri-icon"><AppIcon name="menu-reports" :size="20" /></span>
        </button>
        <!-- מערכת -->
        <button
          class="rail-item"
          :class="{ active: isSystem && !expanded, current: isSystem }"
          title="מערכת"
          @click="toggleSystem"
        >
          <span v-if="expanded" class="ri-label">מערכת</span>
          <span class="ri-icon" :class="{ boxed: expanded && isSystem }"
            ><AppIcon name="menu-system" :size="20"
          /></span>
        </button>
        <!-- system submenu (expanded only) -->
        <div v-if="expanded && systemOpen" class="sys-menu">
          <button
            v-for="it in SYSTEM_ITEMS"
            :key="it.key"
            class="sys-item"
            :class="{ current: it.to && route.path.startsWith(it.to), disabled: !it.to }"
            @click="goSystem(it)"
          >
            <span class="sys-label">{{ it.label }}</span>
            <span class="sys-bullet" />
          </button>
        </div>
      </div>
    </div>

    <div class="rail-bottom">
      <!-- הגדרות -->
      <button class="rail-item settings" title="הגדרות — לא זמין בדמו" @click="disabledMsg">
        <span v-if="expanded" class="ri-label">הגדרות</span>
        <span class="ri-icon"><AppIcon name="menu-settings" :size="20" /></span>
      </button>
      <button
        class="rail-user"
        :title="db.currentUser.name + ' — לחיצה כפולה לאיפוס נתוני הדמו'"
        @dblclick="db.resetDemo()"
      >
        <span v-if="expanded" class="ru-meta">
          <span class="ru-name">{{ db.currentUser.name }}</span>
          <span class="ru-role">{{ db.currentUser.role }}</span>
        </span>
        <span class="rail-avatar">{{ db.currentUser.name.slice(0, 1) }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.rail {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  width: var(--rail-w);
  background: linear-gradient(180deg, var(--rail-navy) 52.27%, var(--rail-navy-2) 100%);
  border-top-left-radius: 20px;
  box-shadow: 0 4px 5px rgba(16, 24, 40, 0.06);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 14px 0 24px;
  z-index: 40;
  transition: width 0.18s ease;
  overflow: hidden;
}
.rail.expanded {
  width: 240px;
  padding: 14px 16px 24px;
}
.rail-top,
.rail-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.rail.expanded .rail-top,
.rail.expanded .rail-bottom {
  align-items: stretch;
}
.rail-collapse {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  padding: 0;
  align-self: flex-start;
  margin-right: 8px;
}
.rail.expanded .rail-collapse {
  margin-right: 0;
}
.rail-logo {
  padding: 8px 0 6px;
  display: flex;
  justify-content: center;
}
.logo-word {
  color: #fff;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 1px;
  text-align: center;
  direction: ltr;
  font-family: "Noto Sans Hebrew", sans-serif;
}
.logo-g {
  font-size: 26px;
}
.logo-sub {
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.75);
}
.rail-menu {
  margin-top: 26px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  align-items: center;
  width: 100%;
}
.rail.expanded .rail-menu {
  align-items: stretch;
  gap: 16px;
}
.rail-item {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  gap: 10px;
}
.rail.expanded .rail-item {
  justify-content: flex-start;
  flex-direction: row;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  padding: 2px 0;
}
.ri-label {
  flex: 1;
  text-align: right;
  color: inherit;
}
.ri-icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  flex-shrink: 0;
}
.rail-item.active .ri-icon,
.ri-icon.boxed {
  background: var(--rail-active-bg);
  color: #fff;
  outline: 1.5px solid rgba(255, 255, 255, 0.35);
}
.rail-item.disabled {
  color: rgba(255, 255, 255, 0.4);
  cursor: not-allowed;
}
.sys-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 8px;
  border-right: 1.5px solid rgba(255, 255, 255, 0.25);
  margin-right: 12px;
  min-width: 0;
}
.sys-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13.5px;
  padding: 5px 4px;
  border-radius: 6px;
}
.sys-label {
  flex: 1;
  text-align: right;
  white-space: nowrap;
}
.sys-bullet {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}
.sys-item.current {
  color: #6cc7f8;
  font-weight: 700;
}
.sys-item.current .sys-bullet {
  background: #6cc7f8;
}
.sys-item.disabled {
  color: rgba(255, 255, 255, 0.45);
}
.sys-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.06);
}
.rail-bottom {
  gap: 14px;
}
.rail-item.settings {
  color: rgba(255, 255, 255, 0.75);
}
.rail-user {
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.rail.expanded .rail-user {
  justify-content: flex-start;
}
.ru-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  order: 1;
}
.ru-name {
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.ru-role {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
}
.rail-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--warning);
  box-shadow: 0 0 0 4px #204683;
  background: #e8edf5;
  color: var(--rail-navy);
  font-weight: 700;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  order: 2;
}
</style>
