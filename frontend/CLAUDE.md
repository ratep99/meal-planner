# Meal Planner — frontend

Vite + React SPA. Root rules live in [../CLAUDE.md](../CLAUDE.md); the specification is
[../docs/spec.md](../docs/spec.md) (Part B covers the UI). This file covers frontend-only conventions.

**Stack:** React 18, TypeScript, Vite 6, TailwindCSS, shadcn/ui, TanStack Query v5, React Router v6,
dnd-kit, react-hook-form + zod, axios, sonner (toasts), vite-plugin-pwa.
**Target:** desktop + iPad landscape, light theme, **UI text in English**.

## Verify with

```bash
./scripts/check-frontend.sh
```

Run from the repo root. There is no host `node` — `npx`, `npm run lint` and `tsc` will all fail if you try
them directly. Add `--build` to also run the production build.

## API access

`VITE_API_URL` or, when empty, same-origin `/api` through the Vite dev proxy (`VITE_PROXY_API` points at
the backend service in Compose). All calls go through the shared `api` axios instance in `lib/api.ts`;
`resolveApiUrl()` builds absolute URLs for PDF/blob downloads. No auth headers, no interceptors.

## Structure

```text
src/
├── api/         one module per resource — thin axios wrappers, no react imports
├── hooks/       <resource>/keys.ts + <resource>/use-<resource>.ts, re-exported by hooks/use<Resource>.ts
├── pages/       route components, lazily loaded via routes/lazy-pages.tsx
├── components/  ui/ (shadcn primitives), shared/, planner/, shopping/, layout/
├── lib/         pure helpers — macro math, planner slots, week dates, formatting
├── context/     active-profile-context.tsx
└── types/       mirrors backend DTOs one-to-one
```

**The layered hooks split is deliberate:** `api/` does HTTP, `hooks/<resource>/` wraps it in TanStack Query
with the key factory from `keys.ts`, and the flat `hooks/useRecipes.ts` files are barrel re-exports that
pages import from. Add new hooks in the nested folder and re-export; do not call axios from a component.

**Every route is lazy.** A new page needs an entry in `routes/lazy-pages.tsx` and a `<Route>` in `App.tsx`,
and the page must be a `default` export.

## Conventions

- **Server state is TanStack Query only.** No Redux, no global store. Local UI state is `useState`; forms
  are react-hook-form + zod.
- **Query keys come from the `keys.ts` factory** for that resource — never hand-write a key array inline,
  or invalidation silently misses.
- **Mutations are optimistic where the user expects instant feedback** (planner drag-and-drop above all),
  with rollback in `onError` and a `sonner` toast. Simple create/update flows may just invalidate.
- **shadcn for UI primitives.** `components/ui/` currently has button, dialog, input, label, slide-over,
  textarea. If you need another primitive, vendor the shadcn component rather than hand-rolling one.
- **Tailwind uses the design tokens**, not raw hex — `text-text-secondary`, `bg-surface`, `text-accent`.
  The palette is defined in `index.css` / `tailwind.config.js` and documented in the spec.
- **Types mirror backend DTOs** field for field in `src/types/`. When a DTO changes, change both sides in
  one commit.
- **There is no charting library.** `recharts` appears in older drafts but is not installed; macro visuals
  are `MacroBar` and `MacroChips`.

## Hard rules

- **No auth, no login page, no JWT.** The app opens straight onto `/dashboard`. The profile switcher is a
  UI-only toggle over `UserProfile` ids — switching profiles never re-authenticates.
- **Macro totals are always live.** No "recalculate" button anywhere; prefer the server's `macros` /
  `GET …/macros` for recipe totals, and `lib/macros.ts` only for client-side sums the API does not provide.
- **Profile screens show `calculatedKcal`** (goal-adjusted), never the maintenance `tdee`, as the daily
  calorie target. Live preview uses debounced `POST /api/profiles/tdee-preview`.
- **Profile edit form must expose `proteinMultiplier` and `fatMultiplier`.**
- **Dashboard is a read-only weekly overview (Mon–Sun)** that links into the planner; the planner is always
  a Mon–Sun view. Day-count changes go through `PUT /api/mealplans/{id}` with a partial `{ daysCount }` body.
- **Recipe image upload** posts multipart to `POST /api/recipes/{id}/image` with the form field named
  **`image`** (not `file`), and must not set `Content-Type` manually — the browser sets the boundary.
  Build image URLs from the DTO's `imageFilename` via `lib/recipe-image.ts`, with an on-error fallback.
- **PDF / shopping list export requires a profile + day selection dialog** before the request.
- **Ingredient form:** added ingredients render as cards, and the search input clears after each add.
- **Empty Open Food Facts results are normal** (OFF returns 503 fairly often) — always show the
  manual-add path instead of an error dead end.

## Known gaps

No test runner is installed — there is nothing to run for frontend tests today. The oversized components
are `pages/Ingredients.tsx` (652 lines), `pages/planner/MealPlanner.tsx` (622),
`pages/recipes/RecipeForm.tsx` (565) and `pages/profiles/ProfileForm.tsx` (540); read only the region you
need rather than the whole file.
