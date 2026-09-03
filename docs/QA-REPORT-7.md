# QA Report — Round 7 (robustness + wide-viewport sweep)

**Target:** live site, 1360×768 and 1920×1080.

| # | Severity | Area | Finding | Status |
|---|----------|------|---------|--------|
| 40 | **P1** | Deploy / routing | Navigating to a route whose lazy chunk changed hash in a newer deploy (e.g. `ProjectsListView-*.js`) 404'd → blank page. Classic SPA stale-chunk problem on static hosting. | **Fixed** — router now uses eager/static imports; the app ships as one bundle, so no per-route chunk can ever go stale. |
| 41 | Info | 1920×1080 | Editor: no page scroll, no horizontal scroll, sidebar 291px, table scrolls internally; composite `פרטים` sub-items render. | Pass |
| 42 | Info | Editor tabs | `הסטוריית סעיף` renders revision cards; `סעיפים חלופיים` shows the radio table when the item has catalog alternatives, else the empty message. | Pass |
| 43 | Info | Build | Single `index-*.js` bundle (≈151 KB gzip); `chunkSizeWarningLimit` raised to silence the expected size notice. | Pass |

## Verified
Composite item + 5-tab panel, dashboard, editor, system screens — no runtime JS errors on the live build (the only console 404s are the intentional 404.html deep-link bootstrap).

## Notes for a future production hardening
If the app grows much larger, reintroduce route-level code-splitting together with a `router.onError` full-reload-on-chunk-error guard; for a demo of this size a single bundle is the simplest robust choice.
