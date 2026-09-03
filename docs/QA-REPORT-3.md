# QA Report — Round 3 (pixel-fidelity pass vs. Figma)

**Target:** https://dev-finext.github.io/kreisberg-claude-fe/ after PR #4 · 1360×768 · compared side-by-side with the Figma frames (editor 1:21386, picker 1:21760, dashboard, project screens)

| # | Severity | Area | Finding | Status |
|---|----------|------|---------|--------|
| 22 | **P1** | Deploy / routing | Deep-link restore still landed on the dashboard after round 2: ES-module imports are hoisted, so vue-router captured `window.location` *before* the restore code in `main.js` ran. | **Fixed** — restore moved to `src/spaRedirect.js`, imported first in `main.js` (executes before the router module). |
| 23 | P2 | BOQ editor · document bar | Bar wrapped onto two lines at 1360 (Figma: single row — title · chips · status · pencil on the right, toggle · search on the left). | **Fixed** — no-wrap chips/labels, title cluster no longer shrinks, search pill shrinks instead, tender action is an icon-only pill. |
| 24 | P3 | BOQ editor · table | Rows were 44px / 13px; Figma frame renders 48px rows with 14px body text. | **Fixed** — 48px rows, 14px cells (headers stay 13px/500). |
| 25 | P3 | BOQ editor · document bar | Document title rendered in the secondary grey; the editor frame shows the primary dark text. | **Fixed** — `--text-primary`. |
| 26 | Info | Dashboard | Tiles, legend order, per-type icons, status stepper match the Figma dashboard frame. | Pass |
| 27 | Info | New project | כללי layout (two columns, divider, מדיה dashed uploads, שדות מיוחדים, פרטי הנכס card) matches the Figma frame. | Pass |
| 28 | Info | Picker | 920px modal, three combos, search + חיפוש/ניקוי, results/tree panes, footer counts — matches 1:21760. | Pass |

## Next round focus
1920×1080 viewport, remaining system screens vs frames (catalog editor spacing, tags panel), focus/hover states, empty states.
