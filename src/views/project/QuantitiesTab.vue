<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import BoqListView from "@/components/boq/BoqListView.vue";
import BoqEditorView from "@/components/boq/BoqEditorView.vue";

const route = useRoute();
const boqId = computed(() => (route.params.boqId ? Number(route.params.boqId) : null));
</script>

<template>
  <BoqEditorView v-if="boqId" :boq-id="boqId" />
  <BoqListView v-else />
</template>
