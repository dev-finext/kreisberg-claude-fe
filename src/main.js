import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./styles/tokens.css";
import "./styles/base.css";

// Restore a deep link captured by public/404.html (GitHub Pages SPA fallback).
// Rewriting the URL before the router's initial navigation avoids racing it.
try {
  const redirect = sessionStorage.getItem("spa-redirect");
  if (redirect) {
    sessionStorage.removeItem("spa-redirect");
    window.history.replaceState(null, "", redirect);
  }
} catch {
  /* storage unavailable — normal boot */
}

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
