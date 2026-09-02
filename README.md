# Kreisberg BOQ — Stakeholder Demo Frontend

Fully-working frontend demo (no backend) of the כתב כמויות (BOQ) and פרויקט flows for the Quantitop / "חישובים בראש טוב" product, built to match the Figma design exactly.

## Stack

- Vue 3 + Vite + Pinia + vue-router
- Hebrew, RTL-first
- Mock data layer (derived from real catalog/DB samples) — persisted to `localStorage`

## Run

```bash
npm install
npm run dev
```

## Regenerate mock data

```bash
npm run gen:data
```

## Scope

- פרויקטים: list → project page (6 tabs; unbuilt tabs rendered disabled)
- כתבי כמויות: full flow — configurations list, creation modal, editor (שיוך/פרקים), item picker, composite items, alternatives, related items, notes, history
- Not built (visibly disabled): login, קטלוג, ניהול תגיות, הצעות מחיר, השוואת הצעות מחיר
