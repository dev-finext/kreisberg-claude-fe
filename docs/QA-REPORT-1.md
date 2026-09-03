# QA Report — Round 1 (external senior QA pass)

**Target:** https://dev-finext.github.io/kreisberg-claude-fe/ (iteration 1, PR #2)
**Viewport:** 1360×768 (design target) · Chrome · RTL
**Scope:** dashboard, project tabs, BOQ list + editor (שיוך/פרקים), picker, tender, system screens, deployment behaviour.

| # | Severity | Area | Finding | Status |
|---|----------|------|---------|--------|
| 1 | **P1** | Deploy | Refreshing / opening a deep link (e.g. `/projects/1/quantities/1`) rendered a blank page: Pages served a cached `404.html` referencing the previous build's hashed JS (404). | **Fixed** — hash-free `public/404.html` stores the path and redirects to the app root; `main.js` restores it. |
| 2 | P2 | BOQ editor · sidebar | Clicking the already-selected structure element deselected it and emptied the table — reads as a bug to stakeholders. | **Fixed** — re-click keeps the selection. |
| 3 | P3 | Dashboard | SLA tile mirrored vs Figma (donut must be on the left, legend on the right). | **Fixed** — `layout="tile"` variant. |
| 4 | P3 | Dashboard | Project-type legend order/colors didn't follow the Figma legend (בית/דירה/בניין/מסחר/אחר). | **Fixed** — driven by `projectTypes` order with the design colors. |
| 5 | P3 | Dashboard | Status stepper counted BOQ headers instead of project statuses. | **Fixed** — counts per project status. |
| 6 | P3 | Dashboard | "סוג פרויקט" column used one generic icon; Figma shows a type-specific glyph per row. | **Fixed** — house/apartment/building/shop/other icons. |
| 7 | P3 | Dashboard | Row click jumped straight into כתבי כמויות; product convention (and the Figma flow) opens the project's כללי tab. | **Fixed** — row → `/projects/:id/general`. |
| 8 | P3 | Tooling | Windows checkout re-introduced CRLF, tripping Prettier locally. | **Fixed** — `.gitattributes` pins LF, tree renormalized. |
| 11 | P3 | Rail | Expanded-menu submenu labels wrapped onto two lines (e.g. "אינדקסים ומטבעות"); Figma shows single-line labels. | **Fixed** — nowrap + tighter indent, rail width 240px. |
| 9 | Info | Editor | Negative quantity rejected with toast "כמות חייבת להיות מספר חיובי" ✓; פרקים mode swaps toolbar/filters/columns ✓; note-count badges render ✓. | Pass |
| 10 | Info | Console | No runtime errors on any visited route (only the 404 from finding #1). | Pass |

## Verified flows (live)
Dashboard → project → כתבי כמויות list → editor → select leaf → 13 rows → expand row (5 tabs) → qty validation → פרקים view (4 chapter groups, aggregated read-only) → back to שיוך.

## Not automatable here (manual check recommended)
File pickers (מסמכים upload, ייבוא כתב כמויות) open the native OS dialog; the flows after selection were verified locally.
