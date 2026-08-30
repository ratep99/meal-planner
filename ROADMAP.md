# Roadmap

Two tracks, pursued in parallel, not in sequence. Concrete next actions live as GitHub issues on
[ratep99/meal-planner](https://github.com/ratep99/meal-planner/issues); this file records why they
matter and what's still vague. See [CLAUDE.md](CLAUDE.md) for engineering conventions,
[docs/spec.md](docs/spec.md) for the domain spec, [CONTEXT.md](CONTEXT.md) for vocabulary, and
[docs/adr/](docs/adr/) for why non-obvious decisions were made.

## Track 1 — household product

The actual reason this app exists: planning real weeks for two people, adapted to their current goals,
producing a PDF plan and a shopping list that get used physically at the store.

**Confirmed working**, verified live in-session: profile creation (React 19 + react-hook-form + zod 4,
live TDEE preview), planner drag-and-drop (dnd-kit 10), and PDF generation mechanics for all three
export endpoints (day / full week / shopping list, all iText 9).

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
