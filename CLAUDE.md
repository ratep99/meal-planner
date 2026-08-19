# Meal Planner — repo root

Household meal planning for two people. React SPA + Spring Boot API + PostgreSQL, run via Docker Compose.

**The full specification is [docs/spec.md](docs/spec.md) — the single source of truth.** Read the section
relevant to your task before changing behaviour. If the code and the spec disagree, the code wins: fix
the spec in the same commit rather than leaving the contradiction.

## Layout

| Path | What it is |
| ---- | ---------- |
| `backend/` | Spring Boot API, package-by-feature under `com.mealplanner` — see `backend/CLAUDE.md` |
| `frontend/` | Vite + React SPA — see `frontend/CLAUDE.md` |
| `docs/spec.md` | Domain model, TDEE/scaling math, every API endpoint, UI rules |
| `legacy/python-mealplan/` | Dead prototype, kept for reference only. **Never change it, never cite it as precedent.** |
| `scripts/` | Verification scripts (below) and the one-off GitHub migration script |

## Verifying your work

The host has no `node`/`npm`, `frontend/node_modules` is an empty mount point, and the host JDK is not
the one this project builds with. **Everything runs through Docker.** Do not conclude a change compiles
without running one of these:

```bash
./scripts/check-frontend.sh     # tsc + eslint  (add --build for the vite production build)
```

```bash
./scripts/check-backend.sh      # mvn test, starts the db service first
```

```bash
./scripts/check-all.sh          # both, before handing work back
```

First run of either is slow (`npm ci` / Maven downloads into a cached volume); later runs are quick.
Run the check that covers what you touched — a frontend-only change does not need the backend suite.

To actually use the app: `docker compose up`, then http://localhost:5173.

## Rules that apply everywhere

- **No authentication anywhere.** No login page, no JWT, no Spring Security, no `User` entity. This is a
  deliberate, closed decision for a two-person LAN deployment — not an oversight to be helpfully fixed.
  Older drafts of the spec described a `User` entity with `passwordHash`; that design is dead.
- **Schema changes go through Flyway only** (`backend/src/main/resources/db/migration`). Never hand-edit
  the schema, never edit an applied migration — add `V11__…`, `V12__…` and so on.
- **The API is camelCase JSON throughout**, and frontend types in `frontend/src/types/` mirror backend
  DTOs field for field. Change both sides in the same commit.
- **The nutrition math is the product.** `TDEECalculator`, `MacroCalculator` and `ScalingCalculator` on the
  backend, `lib/macros.ts`, `lib/planner.ts` and `lib/tdee.ts` on the frontend. A silent rounding change
  here produces a wrong printed meal plan and nobody notices. Touch them only deliberately, and extend
  `TDEECalculatorTest` when you do.
- Ask before adding a dependency. The stack is deliberately small.

## Known gaps — do not treat these as done

- **Tests are narrow, not few.** The backend suite is 33 cases, but 32 of them are `TDEECalculatorTest` and
  the last is a context-load smoke test. `ScalingCalculator`, `MacroCalculator`, `ShoppingListService` and
  every PDF service are untested, and the frontend has no test runner installed at all.
- **No CI.** Nothing runs on push; the scripts above are the only gate.
- **Four oversized components**: `pages/Ingredients.tsx` (652 lines), `pages/planner/MealPlanner.tsx` (622),
  `pages/recipes/RecipeForm.tsx` (565), `pages/profiles/ProfileForm.tsx` (540).
- **Java 17 → 25 upgrade** is wanted but not started; it needs a Spring Boot major upgrade first. Until it
  lands, `pom.xml` and `backend/Dockerfile` (JDK 17) are the truth.
