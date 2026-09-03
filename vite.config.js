import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the app from /<repo>/ — dev stays at /
  base: command === "build" ? "/kreisberg-claude-fe/" : "/",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@demo": fileURLToPath(new URL("./demo-data", import.meta.url)),
    },
  },
  server: {
    port: 5188,
  },
  build: {
    // single eager bundle (see router) — the size warning is expected and fine for a demo
    chunkSizeWarningLimit: 1200,
  },
}));
