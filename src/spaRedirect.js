/**
 * GitHub Pages SPA fallback, step 2 of 2.
 * public/404.html stores the requested deep link and redirects to the app root;
 * this module rewrites the URL back BEFORE the router module is evaluated
 * (it must be the first import in main.js — ES module imports are hoisted and
 * vue-router captures window.location when the history is created).
 */
try {
  const redirect = sessionStorage.getItem("spa-redirect");
  if (redirect) {
    sessionStorage.removeItem("spa-redirect");
    window.history.replaceState(null, "", redirect);
  }
} catch {
  /* storage unavailable — normal boot */
}
