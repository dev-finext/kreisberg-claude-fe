# QA Report — Round 6 (BOQ export/print document)

**Focus:** the כתב כמויות flow had no way to produce the actual document — the end goal of the whole process. Added a branded, printable export.

| # | Severity | Area | Change | Status |
|---|----------|------|--------|--------|
| 37 | Feature | BOQ export | New `BoqExportModal` — a full-page, print-ready document: Kreisberg letterhead, project/config meta, all items grouped by chapter → sub-chapter with unit, aggregated quantity, priority and לסיכום, plus totals. | **Done** |
| 38 | Feature | Print | "הדפסה / ייצוא PDF" triggers the native print dialog; a global `@media print` block hides the app chrome and prints only the document (save-as-PDF works from there). | **Done** |
| 39 | Feature | Entry points | Reachable from the editor document bar (file icon) and from the BOQ list kebab ("הדפסה / ייצוא"). Escape/סגירה closes it. | **Done** |

## Verified (local)
Editor → export: document renders 4 chapters, 39 body rows, totals (24 items). Groups and aggregated quantities match the editor's פרקים view.

## Next
Round 7: final fidelity + polish pass (empty states, focus states, 1920 viewport) and hand-off summary.
