# Meal Planner — Frontend

Read meal-planner-spec.md for full specification before doing anything.

Stack: React 18, TypeScript, Vite, shadcn/ui, TailwindCSS, TanStack Query, dnd-kit
API base: http://localhost:8080

Rules:
- NO auth, NO login page, NO JWT — app opens directly to dashboard
- Macro totals always live — no recalculate buttons
- Optimistic updates on all mutations, rollback on error with toast
- Profile switcher is UI-only toggle, no re-login
- shadcn components only for UI primitives
- All types in /src/types/ mirroring backend DTOs
- Profile edit form includes proteinMultiplier and fatMultiplier inputs