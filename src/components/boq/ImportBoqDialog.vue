<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "@/components/shared/AppIcon.vue";

const props = defineProps({
  projectId: { type: Number, required: true },
});
const emit = defineEmits(["close"]);

const router = useRouter();
const fileInput = ref(null);
const fileName = ref("");

onMounted(() => fileInput.value?.click());

function onFile(e) {
  const f = e.target.files?.[0];
  if (!f) {
    emit("close");
    return;
  }
  fileName.value = f.name;
}
function goToMapping() {
  router.push({ path: "/system/mapping", query: { import: fileName.value, project: props.projectId } });
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,.xls,.csv"
      hidden
      @change="onFile"
      @cancel="emit('close')"
    />
    <div v-if="fileName" class="overlay" @mousedown.self="emit('close')">
      <div class="dialog">
        <button class="close" @click="emit('close')"><AppIcon name="cancel" :size="20" /></button>
        <h3 class="title">נדרש מיפוי לקובץ</h3>
        <p class="text">
          ייתכנו פערים בשמות העמודות בקובץ שברצונך לייבא.<br />
          כדי להמשיך לעבוד במערכת, תצטרך למפות את הקובץ.<br />
          האם תרצה להמשיך?
        </p>
        <p class="file num">{{ fileName }}</p>
        <div class="actions">
          <button class="btn btn-primary" @click="goToMapping">מעבר למיפוי קובץ</button>
          <button class="btn btn-secondary" @click="emit('close')">ביטול</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 44, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 70;
}
.dialog {
  position: relative;
  width: 396px;
  background: var(--surface);
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  padding: 30px 32px 28px;
  text-align: right;
}
.close {
  position: absolute;
  left: 16px;
  top: 16px;
  background: none;
  border: none;
  color: var(--text-primary);
  display: inline-flex;
}
.title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.text {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-primary);
}
.file {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 10px 0 18px;
}
.actions {
  display: flex;
  gap: 12px;
  flex-direction: row-reverse;
  justify-content: flex-start;
}
</style>
