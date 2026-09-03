# QA Report — Round 4 (user-reported issues on the live site)

**Reporter:** product owner, against https://dev-finext.github.io/kreisberg-claude-fe/projects/1/quantities/1

| # | Severity | Area | Finding | Status |
|---|----------|------|---------|--------|
| 29 | **P1** | Page header | שמירה / ביטול were mirrored — title rendered on the left, buttons on the right (a double `flex-direction: row-reverse` inside an already-RTL container). | **Fixed** — title on the right, action group on the left, primary (שמירה) at the far-left edge. |
| 30 | **P1** | BOQ editor | The שיוך / פרקים sidebar was not sticky — the whole page scrolled and the sidebar scrolled away with it. | **Fixed** — the project card is now viewport-bounded and the editor is a bounded flex region; the items table scrolls internally while the sidebar stays put. Project tabs (כללי / משאבים / מסמכים / תנאים) scroll their own content within the card. |
| 31 | P2 | Structure tree | With many children the tree had no independent scroll. | **Fixed** — the tree scrolls within the bounded sidebar (slim scrollbar); drag handle + kebab still appear on hover. |
| 32 | P2 | App rail | The navy rail started collapsed; Figma shows it open with its labels + מערכת submenu. | **Fixed** — rail defaults to expanded. |
| 33 | P3 | BOQ editor | Wide items table overflowed the narrower content area once the rail opened. | **Fixed** — table scrolls horizontally inside its own wrapper (page never scrolls sideways). |

## Verified (1360×768, local)
Page no longer scrolls; items table scrolls internally (`tableScrollable: true`, `pageScrolls: false`); rail expanded; header buttons on the correct sides.
