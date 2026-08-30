# Roadmap

Two tracks, pursued in parallel, not in sequence. Concrete next actions live as GitHub issues on
[ratep99/meal-planner](https://github.com/ratep99/meal-planner/issues); this file records why they
matter and what's still vague. See [CLAUDE.md](CLAUDE.md) for engineering conventions,
[docs/spec.md](docs/spec.md) for the domain spec, [CONTEXT.md](CONTEXT.md) for vocabulary, and
[docs/adr/](docs/adr/) for why non-obvious decisions were made.

## Track 1 — household product

The actual reason this app exists: planning real weeks for two people, adapted to their current goals,
producing a PDF plan and a shopping list that get used physically at the store.

**Confirmed working**, verified live in a full click-through pass (recipes, planner, shopping, ingredients,
profiles): profile create/edit with live TDEE preview (React 19 + react-hook-form + zod 4), recipe
edit/save, ingredient search/sort/filter, planner drag-and-drop with entries landing at portion 1.0 (no
auto-scaling — [ADR-0001](docs/adr/0001-portions-default-unscaled.md)), shopping list generation and
aggregation, and all three PDF exports (day / full week / shopping list, iText 9) — content and quantities
checked against the source recipes, not just "it returned a 200".

That pass also found and fixed three real bugs, not yet released:

- Planner recipe-filter labels were missing their second letter ("Beakfast", "Lnch") — a duplicate
  `.slice(1)` in `RecipeSidebar.tsx`, present since the component's first commit.
- The profile list mislabeled the goal-adjusted daily target as "TDEE" — harmless for a MAINTAIN profile
  where the two numbers coincide, but wrong by hundreds of kcal for CUT/BULK (confirmed with a throwaway
  CUT profile: real TDEE 2759 vs. the mislabeled 2345 it would have shown).
- The shopping lists page always showed "— ingredients": the frontend read `ingredientCount`/`itemCount`,
  fields that don't exist on the API response — the real field is `totalItems`. `frontend/src/types/shopping.ts`
  had both wrong names typed as optional, which is exactly why `tsc` never caught it.

One more is filed, not yet fixed: [issue #7](https://github.com/ratep99/meal-planner/issues/7) — the full
week PDF export can split a day's meal block across a page boundary when a day has four full meals.

**Code-quality findings from a source read** (not the click-through pass above — this was reading
`ShoppingListService`, `RecipeService`, the exception handler, and every hook's `onError`, looking for
what a click-through can't surface). Filed as `ready-for-human`, not `ready-for-agent`: these are meant as
deliberate practice for the person building this, not autopilot work.

- Every mutation hook swallows the backend's actual error message and shows a fixed generic string —
  confirmed across all 19 `onError` sites, none of which reads `err.response`. The backend already returns
  specific messages (e.g. a 409 on deleting a meal plan that still has a shopping list attached says so);
  none of that reaches the user. [Issue #9](https://github.com/ratep99/meal-planner/issues/9)
- N+1 queries on the full-week PDF export and shopping list generation — the two most-used endpoints once
  the app is in real weekly use. One query already does this right for the single-day PDF
  (`MealPlanDayRepository.findByMealPlanIdAndDayNumberWithDetails`, `JOIN FETCH`); `MealPlanRepository` has
  no equivalent, so both paths walk `plan → days → entries → recipe → ingredients → ingredient` one lazy
  query at a time. [Issue #10](https://github.com/ratep99/meal-planner/issues/10)
- Deleting a recipe removes it from every meal plan entry that used it, past or future — correct behavior
  (no DB cascade on that FK), but the only warning is a generic `confirm("Delete this recipe?")` that
  doesn't say what's about to disappear. [Issue #11](https://github.com/ratep99/meal-planner/issues/11)

**Open:**

- No portion control in the planner UI yet — the backend accepts an explicit `scalingFactor` per entry
  (see [ADR-0001](docs/adr/0001-portions-default-unscaled.md)), nothing in the frontend sends one.
  [Issue #2](https://github.com/ratep99/meal-planner/issues/2)
- No frontend test runner — `tsc` + eslint + a production build are the only gate today.
  [Issue #3](https://github.com/ratep99/meal-planner/issues/3)
- The imported EASY FIT week (19 recipes, 32 ingredients) sits unpopulated, waiting on real profile
  targets for both household members. [Issue #4](https://github.com/ratep99/meal-planner/issues/4)
- The full weekly cycle — real profiles, a real week, PDF, shopping list — hasn't been walked through
  end to end with real data, only with placeholders. [Issue #5](https://github.com/ratep99/meal-planner/issues/5)
- "Many features to come" — no candidate list committed yet. Add here as they're actually decided, not
  before; a wishlist nobody's committed to is worse than no list.

## Track 2 — skill-building

Using the newest release of every technology in this stack, in real daily-use code rather than a toy
project. Landed this session: Spring Boot 4.1.0, Java 25, React 19, Tailwind 4, Vite 8, Zod 4, Router 7,
ESLint 10 — see `CLAUDE.md`'s "Known gaps" for the one deliberate holdout (TypeScript 6.x, blocked on
typescript-eslint's peer range).

Deliberately deferred, not forgotten — named here so they don't get silently dropped, not because either
has a plan yet:

- Deploy orchestration
- Monetization

Nothing else is committed to this track until it's actually decided; this section stays a placeholder
rather than a guessed list of technologies nobody's asked to learn.
