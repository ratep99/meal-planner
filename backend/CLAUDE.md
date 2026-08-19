# Meal Planner — backend

Spring Boot API. Root rules live in [../CLAUDE.md](../CLAUDE.md); the specification is
[../docs/spec.md](../docs/spec.md). This file covers backend-only conventions.

**Stack:** Spring Boot 3.4.4, Java 17, PostgreSQL 16, Flyway, iText 7, Lombok, MapStruct, WebFlux
(`WebClient` for Open Food Facts only — the API itself is servlet-based MVC).
**Package root:** `com.mealplanner`

## Verify with

```bash
./scripts/check-backend.sh
```

Run from the repo root. It starts the `db` service and runs `mvn test` in a JDK 17 container.

## Structure

Package-by-feature, not by layer. Each feature package holds its own entity, repository, service,
controller and DTOs together:

```text
com.mealplanner
├── profile/     UserProfile, TDEECalculator, TdeePreviewRequest, …
├── ingredient/  Ingredient + openff/ (OpenFoodFactsClient, OpenFoodFactsMapper)
├── recipe/      Recipe, RecipeIngredient, MacroCalculator
├── mealplan/    MealPlan, MealPlanDay, MealPlanEntry, ScalingCalculator
├── shopping/    ShoppingList, ShoppingListItem
├── pdf/         MealPlanPdfService, ShoppingListPdfService
├── config/      WebClientConfig (OFF), WebMvcConfig (/uploads/** static)
└── common/      enums/, exception/
```

Keep new code in the feature package it belongs to. Do not introduce `service/`, `dto/` or `model/`
top-level packages.

## Conventions

- **Calculations are pure static classes** — `TDEECalculator`, `MacroCalculator`, `ScalingCalculator` take
  values in and return values out, no Spring, no repositories. Keep them that way; it is why they are the
  only part of the backend that is cheap to test.
- **DTO mapping is a static `from(...)` factory** on the response record/class (`RecipeResponse.from(recipe)`),
  called from the service. MapStruct is on the classpath but the codebase uses hand-written factories —
  follow the existing pattern rather than mixing both.
- **Services carry `@Transactional`**, controllers stay thin (validate, delegate, return).
  Read paths use `@Transactional(readOnly = true)`.
- **Not-found is `ResourceNotFoundException`**, translated to HTTP by `GlobalExceptionHandler`. Never
  return `null` or `Optional` from a service for a missing resource.
- **Requests are validated with `@Valid`** on the controller parameter plus Jakarta constraints on the
  request class. Every controller already does this — do not skip it on new endpoints.
- **Aggregates are saved through their root.** Meal plan entries are persisted via
  `mealPlanRepository.save(day.getMealPlan())`, recipe lines via `recipeRepository.save(recipe)`. This keeps
  cascade and `orphanRemoval` behaviour consistent — do not reach for the child repository to save.

## Hard rules

- **No Spring Security, no JWT, no auth of any kind.** See the root CLAUDE.md.
- **Flyway for every schema change.** Next migration is `V11__…`. `spring.jpa.hibernate.ddl-auto=validate`
  is deliberate — the app refuses to start if entities and schema disagree, which is the intended alarm.
- **Recipe macros recalculate on every `RecipeIngredient` save.** `RecipeResponse.from()` always computes
  fresh totals; there is no cached macro column to keep in sync and none should be added.
- **PIECE ingredients round to the nearest integer, minimum 1** when scaling. A plan that says "0 eggs"
  is a bug.
- **Scaling uses `profile.calculatedKcal`** (goal-adjusted), never the raw maintenance `tdee`.
- **Changing a profile must refresh its meal plan entries** — `MealPlanService.refreshEntriesForUserProfile`.
  Stored `calculatedKcal`/macros on entries go stale otherwise.
- **Images:** local filesystem at `${app.upload.dir}/recipes/{recipeId}.jpg`; API exposes `imageFilename`;
  the multipart form field is **`image`**, not `file`. Spring serves `/uploads/**` via `WebMvcConfig`.
- **Deleting a recipe** first deletes referencing `MealPlanEntry` rows (no DB cascade on that FK), then the
  image file, then the recipe.
- **Open Food Facts** calls go through the configured `WebClient` with the descriptive `User-Agent`. OFF
  returning 503 and therefore empty search results is expected upstream flakiness, not an app bug.
- Local secrets belong in `application-local.properties` (gitignored), never in `application.properties`.

## Testing

`src/test/java/…/TDEECalculatorTest.java` (32 cases in `@Nested` groups) is the model to copy: pure JUnit,
no Spring context, a documented reference profile with the arithmetic spelled out in the class comment. `MealPlannerApplicationTests` is a
context-load smoke test and needs a live PostgreSQL, which is why the check script starts `db` first.

`MacroCalculatorTest` and `ScalingCalculatorTest` follow the same shape and cover the nutrition math end
to end, including the two behaviours that look wrong at first glance: piece scaling rounds before computing
macros (so piece-based recipes drift off the calorie target, while weight-only recipes hit it exactly), and
`optional` lines still count towards recipe macros.

Untested and worth covering next: `ShoppingListService` aggregation, and `MealPlanService.assignRecipe` /
`refreshEntriesForUserProfile`. Those need a Spring context or hand-built repository fakes, which is why
they were not done alongside the pure calculators.
