<script setup>
import { useRouter } from "vue-router";
import { useDbStore } from "@/stores/db";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/components/shared/AppIcon.vue";

const router = useRouter();
const db = useDbStore();
const ui = useUiStore();

const disabledMsg = () => ui.toast("מסך זה אינו זמין בדמו", "warning");
const initials = db.currentUser.name.slice(0, 1);
</script>

<template>
  <nav class="rail">
    <div class="rail-top">
      <button class="rail-collapse" title="כיווץ תפריט">
        <AppIcon name="chevron-right" :size="24" />
      </button>
      <div class="rail-logo" title="KREISBERG">
        <svg width="30" height="24" viewBox="0 0 30 24" fill="none">
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
      </div>
      <div class="rail-icons">
        <button class="rail-icon active" title="פרויקטים" @click="router.push('/projects')">
          <AppIcon name="menu-projects" :size="22" />
        </button>
        <button class="rail-icon disabled" title="דוחות — לא זמין בדמו" @click="disabledMsg">
          <AppIcon name="menu-reports" :size="22" />
        </button>
        <button class="rail-icon disabled" title="מערכת (קטלוגים, תגיות) — לא זמין בדמו" @click="disabledMsg">
          <AppIcon name="menu-system" :size="22" />
        </button>
        <button class="rail-icon disabled" title="הגדרות — לא זמין בדמו" @click="disabledMsg">
          <AppIcon name="menu-settings" :size="22" />
        </button>
      </div>
    </div>
    <div class="rail-bottom">
      <button
        class="rail-avatar"
        :title="db.currentUser.name + ' — איפוס נתוני הדמו בלחיצה כפולה'"
        @dblclick="db.resetDemo()"
      >
        {{ initials }}
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
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 24px;
  z-index: 40;
}
.rail-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.rail-collapse {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  padding: 0;
  align-self: flex-start;
  margin-right: 8px;
}
.rail-logo {
  padding: 8px 0 6px;
}
.rail-icons {
  margin-top: 26px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
}
.rail-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
}
.rail-icon.active {
  background: var(--rail-active-bg);
  color: #fff;
}
.rail-icon.disabled {
  color: rgba(255, 255, 255, 0.35);
  cursor: not-allowed;
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
}
</style>
