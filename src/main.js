import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./styles/tokens.css";
import "./styles/base.css";

// Restore a deep link captured by public/404.html (GitHub Pages SPA fallback)
try {
  const redirect = sessionStorage.getItem("spa-redirect");
  if (redirect) {
    sessionStorage.removeItem("spa-redirect");
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const target = redirect.startsWith(base) ? redirect.slice(base.length) || "/" : redirect;
    router.replace(target);
  }
} catch {
  /* storage unavailable — normal boot */
}

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
