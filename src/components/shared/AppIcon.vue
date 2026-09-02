<script setup>
/**
 * Single-weight 1.5px line icons, currentColor, drawn to match the design's
 * icon set (18-24px). Geometry approximated from the Figma glyphs.
 */
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 24 },
});
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- chevron pointing down (expanded) -->
    <template v-if="name === 'chevron-down'">
      <path d="M6 9l6 6 6-6" />
    </template>
    <!-- chevron pointing left (collapsed, RTL) -->
    <template v-else-if="name === 'chevron-left'">
      <path d="M15 6l-6 6 6 6" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="M9 6l6 6-6 6" />
    </template>
    <!-- open eye -->
    <template v-else-if="name === 'eye'">
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </template>
    <!-- closed eye: eyelash arc with lashes (not a slashed eye) -->
    <template v-else-if="name === 'eye-closed'">
      <path d="M3 10c2.2 2.7 5.3 4.2 9 4.2S18.8 12.7 21 10" />
      <path d="M12 14.5v2.7" />
      <path d="M7.2 13.6l-1.4 2.3" />
      <path d="M16.8 13.6l1.4 2.3" />
    </template>
    <!-- circled plus (add 18x18) -->
    <template v-else-if="name === 'plus-circle'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <!-- kebab ⋮ -->
    <template v-else-if="name === 'kebab'">
      <circle cx="12" cy="5.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1.1" fill="currentColor" stroke="none" />
    </template>
    <!-- drag handle ⠿ (2x3 dots) -->
    <template v-else-if="name === 'drag'">
      <circle cx="9.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </template>
    <!-- search -->
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8L20 20" />
    </template>
    <!-- pencil -->
    <template v-else-if="name === 'pencil'">
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 6.5l3 3" />
    </template>
    <!-- trash -->
    <template v-else-if="name === 'trash'">
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6.5 7l1 12a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12" />
      <path d="M10 11v6M14 11v6" />
    </template>
    <!-- copy -->
    <template v-else-if="name === 'copy'">
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
    </template>
    <!-- paste -->
    <template v-else-if="name === 'paste'">
      <rect x="6" y="4.5" width="12" height="16" rx="2" />
      <path d="M9.5 4.5a2.5 2.5 0 0 1 5 0" />
      <path d="M9 10.5h6M9 14h6M9 17.5h3.5" />
    </template>
    <!-- cancel ✕ -->
    <template v-else-if="name === 'cancel'">
      <path d="M6 6l12 12M18 6L6 18" />
    </template>
    <!-- note / comments doc -->
    <template v-else-if="name === 'note'">
      <rect x="4.5" y="4" width="15" height="16" rx="2.5" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
    </template>
    <!-- history clock -->
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </template>
    <!-- info -->
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </template>
    <!-- megaphone (יציאה למכרז) -->
    <template v-else-if="name === 'megaphone'">
      <path d="M4 10v4a1 1 0 0 0 1 1h2l4 4V5L7 9H5a1 1 0 0 0-1 1Z" />
      <path d="M14.5 8.5a5 5 0 0 1 0 7" />
      <path d="M17.5 6a9 9 0 0 1 0 12" />
    </template>
    <!-- rail: projects (3 lines) -->
    <template v-else-if="name === 'menu-projects'">
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" stroke-width="2" />
    </template>
    <!-- rail: reports/document -->
    <template v-else-if="name === 'menu-reports'">
      <path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4.5" />
    </template>
    <!-- rail: system/monitor -->
    <template v-else-if="name === 'menu-system'">
      <rect x="3.5" y="5" width="17" height="12" rx="1.5" />
      <path d="M9 20h6M12 17v3" />
    </template>
    <!-- rail: gear -->
    <template v-else-if="name === 'menu-settings'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V19.6a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H4.4a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 6.05 7.45a1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 8.48 2.7l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56V1.4a2 2 0 0 1 4 0v.09c0 .68.4 1.3 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08c.26.63.88 1.03 1.56 1.03h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z"
      />
    </template>
    <!-- checkmark -->
    <template v-else-if="name === 'check'">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </template>
    <!-- toast success circle-check (filled green handled by CSS color) -->
    <template v-else-if="name === 'check-circle'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3l2.4 2.4 4.6-4.9" />
    </template>
    <template v-else-if="name === 'alert-circle'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
    </template>
    <!-- collapse chevrons for rail -->
    <template v-else-if="name === 'collapse'">
      <path d="M10 6l6 6-6 6" />
    </template>
  </svg>
</template>
