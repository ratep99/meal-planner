# Meal plan entries default to an unscaled Portion; scaling is never automatic

Status: accepted

**Context.** Meal plan entries used to compute a scaling factor automatically as
`profile.calculatedKcal / mealsPerDay / recipe.totalKcal`, multiplying every ingredient quantity on
assignment so every entry landed on an identical calorie figure regardless of meal type.

**Decision.** An entry now defaults to Portion 1.0 — the Recipe exactly as written — and only scales
when a caller explicitly sends a `scalingFactor` (0.1–10.0, validated, persisted). Nothing derives a
portion from a Profile's Target automatically, either on assignment or when the Profile is edited
afterward.

**Why.** The automatic version had two concrete failures, not just an aesthetic one. `mealsPerDay`
defaulted to 3 while the planner always shows four meal rows (breakfast/lunch/dinner/snack), so a day
silently overshot its target by a third. And it scaled every meal type identically, turning a 192 kcal
snack into 920 kcal — 120g of whey and 720g of kiwi — because the math had no notion that a snack should
stay small. Scaling that silently rewrites what's in a snack is a worse failure mode than a day that
doesn't perfectly hit its target: a person can top up an obviously-small entry themselves; they can't
easily notice a snack that quietly became a full meal.

## Considered options

- Keep automatic scaling, fix the `mealsPerDay` default, exempt snacks. Rejected: still silently
  rewrites quantities on every assignment, which is the part that actually surprised people, not just
  the arithmetic being off.
- Scale automatically but cap the factor for small meal types (e.g. snacks scale at most ×1.5). Rejected:
  still a rule nobody asked for, and now a second undocumented number to explain.

## Consequences

A day's actual total may legitimately sit under or over the Profile's Target — that is expected, not a
bug, and no UI should imply otherwise. A UI control for choosing a Portion explicitly is still missing:
the backend accepts `scalingFactor` but nothing in the frontend sends it (tracked as
[issue #2](https://github.com/ratep99/meal-planner/issues/2)).
