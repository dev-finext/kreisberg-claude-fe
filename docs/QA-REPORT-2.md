# QA Report — Round 2 (external senior QA pass)

**Target:** https://dev-finext.github.io/kreisberg-claude-fe/ after PR #3 · 1360×768 · Chrome · RTL
**Focus:** end-to-end CRUD on every tab, deep-link behaviour after the round-1 fix, keyboard UX, console hygiene.

| # | Severity | Area | Finding | Status |
|---|----------|------|---------|--------|
| 12 | **P1** | Deploy / routing | Deep link now loads the app (no blank page) but lands on the dashboard instead of the requested route — the path restore raced the router's initial navigation. | **Fixed** — the captured path is applied with `history.replaceState` *before* the router boots. |
| 13 | P3 | UX / keyboard | Escape did not close modals (BaseModal, item picker, item edit, tender, catalog item). | **Fixed** — shared `useEscape` composable wired into all dialog components. |
| 14 | Info | Project flow | פרויקט חדש → fill form → שמור creates the project and redirects to its כללי tab; toast "הפרויקט נוצר בהצלחה!". | Pass |
| 15 | Info | תנאים מיוחדים | צור תנאי חדש → inline row → Enter saves ("התנאי נוסף"). | Pass |
| 16 | Info | משאבים | צרף איש קשר → modal → 2 contacts attached (3 → 5 rows), toast with count. | Pass |
| 17 | Info | מסמכים | חדש → folder modal → folder created and auto-selected. | Pass |
| 18 | Info | קטלוגים | Row click opens עריכת סעיף (with סעיף מורכב toggle); saving persists the change into the table. | Pass |
| 19 | Info | ייבוא / מיפוי | `/system/mapping?import=…&project=2` shows the import banner; "סיום מיפוי וייבוא" creates the BOQ with two structure elements and jumps into the editor. | Pass |
| 20 | Info | Dashboard | Type icons per project row (12/12), SLA tile in Figma orientation, legend order בית/דירה/בניין/מסחר/אחר. | Pass |
| 21 | Info | Console | No runtime errors on visited routes. | Pass |

## Round-2 regression check of round-1 items
#2 (sticky selection), #3–#7 (dashboard), #11 (rail submenu) verified on the live build.

## Next round focus
Pixel-fidelity pass against the Figma renders per screen (spacing, type scale, exact colours), 1920×1080 viewport check, RTL edge cases in tables.
