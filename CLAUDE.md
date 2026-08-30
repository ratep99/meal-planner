# Meal Planner — repo root

Household meal planning for two people. React SPA + Spring Boot API + PostgreSQL, run via Docker Compose.

**The full specification is [docs/spec.md](docs/spec.md) — the single source of truth for how the app
works.** Read the section relevant to your task before changing behaviour. If the code and the spec
disagree, the code wins: fix the spec in the same commit rather than leaving the contradiction.

**[ROADMAP.md](ROADMAP.md) is the source of truth for where the project is going** — the two tracks it's
pursuing and what's open on each. [CONTEXT.md](CONTEXT.md) is a glossary of domain vocabulary (Portion,
Meal Plan Entry, Profile, Target — precise, opinionated, deliberately thin). [docs/adr/](docs/adr/)
records *why* a non-obvious decision was made, when the code alone wouldn't tell you.

## Layout

| Path | What it is |
| ---- | ---------- |
| `backend/` | Spring Boot API, package-by-feature under `com.mealplanner` — see `backend/CLAUDE.md` |
| `frontend/` | Vite + React SPA — see `frontend/CLAUDE.md` |
| `docs/spec.md` | Domain model, TDEE/scaling math, every API endpoint, UI rules |
| `CONTEXT.md` | Domain glossary — read this before ROADMAP.md or an ADR for precise vocabulary |
| `ROADMAP.md` | Where the project is going, on both tracks it's pursuing |
| `docs/adr/` | Why non-obvious, hard-to-reverse decisions were made |
| `scripts/` | Verification scripts (below) |

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
- **Meals are not scaled automatically.** An entry uses its recipe as written (factor 1.0) unless a
  `scalingFactor` is explicitly sent. Deriving portions from the profile is a design that was removed
  deliberately — see the portion logic section in the spec before reintroducing anything like it.
- **The nutrition math is the product.** `TDEECalculator`, `MacroCalculator` and `ScalingCalculator` on the
  backend, `lib/macros.ts`, `lib/planner.ts` and `lib/tdee.ts` on the frontend. A silent rounding change
  here produces a wrong printed meal plan and nobody notices. Touch them only deliberately, and extend
  `TDEECalculatorTest` when you do.
- Ask before adding a dependency. The stack is deliberately small.

## Known gaps — do not treat these as done

- **Tests cover the calculators only.** The backend suite is 61 cases across `TDEECalculatorTest`,
  `MacroCalculatorTest` and `ScalingCalculatorTest`, plus a context-load smoke test. Everything with a
  dependency on Spring or the database is untested — `MealPlanService`, `ShoppingListService`, the PDF
  services and every controller. The frontend has no test runner installed at all.
- **CI runs the same scripts** (`.github/workflows/checks.yml`) on every push and pull request, so a
  green local check and a green CI mean the same thing. There is nothing else automated.
- **Four oversized components**: `pages/Ingredients.tsx` (652 lines), `pages/planner/MealPlanner.tsx` (622),
  `pages/recipes/RecipeForm.tsx` (565), `pages/profiles/ProfileForm.tsx` (540).
- **TypeScript is held at 6.x**, not 7, because typescript-eslint declares a peer of `typescript <6.1.0`.
  Everything else is on its latest release. Don't "finish the upgrade" without checking that peer range.
- **`frontend/.npmrc` sets `legacy-peer-deps=true`** and it is load-bearing: `@vitejs/plugin-react` 6
  optionally peers a babel chain npm cannot resolve, and without the flag `npm ci` rejects the lock file.

## Agent skills

Issues are tracked as GitHub issues on `ratep99/meal-planner`, via the `gh` CLI, labelled with the
five canonical triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
`wontfix`). Domain docs are single-context: `docs/spec.md` is the source of truth for behaviour,
`CONTEXT.md` for vocabulary, `docs/adr/` for why. All three exist — extend them, don't wait to create
them lazily; `ROADMAP.md` is where new open questions should land first if they're not yet a concrete
issue.

If `docs/agents/` exists locally (from running the `setup-matt-pocock-skills` skill), it holds the fuller
per-repo configuration — issue tracker conventions, triage label vocabulary, wayfinding operations. That
directory is intentionally gitignored, not part of the repo: re-run the skill on a fresh clone rather than
expecting it to be there.
