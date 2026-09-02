import pluginVue from "eslint-plugin-vue";
import prettierConfig from "@vue/eslint-config-prettier";

export default [
  { ignores: ["dist/**", "node_modules/**", "demo-data/**"] },
  ...pluginVue.configs["flat/recommended"],
  prettierConfig,
  {
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/no-v-html": "off", // used once, for the picker's search-highlight (input is escaped first)
    },
  },
];
