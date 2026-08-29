# Meal Planner App — Specification (Backend + Frontend)

> **This file is the single source of truth.** It replaced the two drifted copies that used to
> live at `backend/meal-planner-spec.md` and `frontend/meal-planner-spec.md`. Do not recreate those.
> If code and this document disagree, the code wins — fix this document in the same commit.
>
> **Backend stack**: Spring Boot 4.1.0 | PostgreSQL 16 | Java 25 | Maven  
> **Frontend stack**: React 19 + Vite 8 | TypeScript 6 | shadcn/ui | Tailwind 4 | TanStack Query v5 | React Router v7  
> **Status**: Implementation reference — describes what is built, not what is wished for.  
> **Last updated**: 2026-08-30

Every dependency is on its latest release except **TypeScript**, held at 6.x because
typescript-eslint declares a peer of `typescript <6.1.0`. Moving to TypeScript 7 means giving up
working lint until that peer range widens.

---

## Project Overview

A meal planning application for two users (Petar + wife) that:

- Calculates TDEE and macro targets per user via profile input (goal-adjusted daily calories)
- Stores ingredients with nutritional data (Open Food Facts API + manual)
- Manages recipes with per-ingredient quantities (grams or pieces)
- Generates meal plans for 1–N days (default **7**), scaled per user profile
- Auto-calculates macros/calories when recipes or quantities are modified
- Generates shopping lists covering multiple meal plans (e.g. 2 × 3-day = 6 days)
- Exports meal plan PDFs: **single day** (1 A4 page) and **full plan** (one page per day in one file), plus shopping list PDF

---

# Part A — Backend

## Domain Model

### User Profile

> **No authentication.** Single household app — no login, no JWT, no Spring Security, no `User` entity.  
> **UserProfiles are standalone** open-access records (e.g. Petar, Ana).

```java
// UserProfile — nutritional and physical data per household member
UserProfile {
    Long id
    String displayName             // e.g. "Petar", "Ana"
    Gender gender                  // MALE / FEMALE
    int age
    int heightCm
    double weightKg
    ActivityLevel activityLevel    // SEDENTARY / LIGHT / MODERATE / ACTIVE / VERY_ACTIVE
    Goal goal                      // CUT / MAINTAIN / BULK
    double proteinMultiplier       // g protein per kg bodyweight (default 2.0)
    double fatMultiplier           // g fat per kg bodyweight (default 0.8)
    // Calculated on create/update (and mirrored by TDEE preview):
    int calculatedKcal             // daily target after goal — not raw maintenance TDEE
    int targetProtein
    int targetCarbs
    int targetFat
}
```

**TDEE logic (Mifflin–St Jeor) — matches `TDEECalculator`:**

```
BMR (male)   = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
BMR (female) = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161

Activity multipliers:
  SEDENTARY    = 1.2
  LIGHT        = 1.375
  MODERATE     = 1.55
  ACTIVE       = 1.725
  VERY_ACTIVE  = 1.9

maintenanceTDEE = BMR × activityMultiplier   // not rounded; exposed as `tdee` on breakdown API

Goal calorie multipliers (applied to maintenance TDEE before rounding daily target):
  CUT      = × 0.85   (−15%)
  MAINTAIN = × 1.0
  BULK     = × 1.125  (+12.5%)

calorieBudget = maintenanceTDEE × goalMultiplier
calculatedKcal = round(calorieBudget)

Macro split (per kg bodyweight; carbs fill remainder of **calorieBudget**, using unrounded budget for carb math):
  Protein (g) = round(proteinMultiplier × weightKg)
  Fat     (g) = round(fatMultiplier × weightKg)
  Carbs   (g) = round(max(0, calorieBudget − protein×4 − fat×9) / 4)
```

**API:** `POST /api/profiles/tdee-preview` accepts the same numeric fields as profile create/update **except `displayName`** and returns the same breakdown shape as `GET /api/profiles/{id}/tdee`, so the frontend can preview CUT / MAINTAIN / BULK without duplicating this math. Use **`calculatedKcal`** for the daily calorie target in UI, not maintenance **`tdee`**.

---

### Ingredients

```java
Ingredient {
    Long id
    String name
    String openFoodFactsId         // nullable — if sourced from OFF API
    IngredientSource source        // OPEN_FOOD_FACTS / MANUAL
    UnitType unitType              // WEIGHT / PIECE
    Double pieceWeightGrams        // nullable — only if PIECE (e.g. tortilla = 45g)
    double kcalPer100g
    double proteinPer100g
    double carbsPer100g
    double fatPer100g
    double fiberPer100g
    IngredientCategory category    // PRODUCE / DAIRY / MEAT / GRAIN / PANTRY / OTHER
    LocalDateTime createdAt
    boolean manualOverride         // if true, OFF sync must not overwrite nutritional values
}
```

**Open Food Facts integration**

- Search (used by backend): `GET …/cgi/search.pl?search_terms={query}&json=1&page_size=10` (base URL configurable).
- Product lookup (future / barcode): `GET …/api/v2/product/{barcode}`
- No API key required.
- Backend uses a dedicated `WebClient` with **`User-Agent`** (`open-food-facts.user-agent` in config) and **retries with backoff** on 5xx / 429. Transient **503** from OFF still yields an empty search result after retries — not a bug in the app.
- Cache in DB — do not re-fetch if already stored (`openFoodFactsId` / existing row).
- Fields mapped include: product name, energy-kcal, proteins, carbohydrates, fat, fiber per 100g.

---

### Recipes

```java
Recipe {
    Long id
    String name
    MealType mealType              // BREAKFAST / LUNCH / DINNER / SNACK
    String description
    Integer prepTimeMin
    LocalDateTime createdAt
    LocalDateTime updatedAt
    // Response includes imageFilename (e.g. "{id}.jpg"); file lives under uploads/recipes/
}

RecipeIngredient {
    Long id
    Long recipeId
    Long ingredientId
    double quantity
    QuantityUnit unit              // GRAMS / PIECES
    boolean optional
}
```

**DTOs**

- `GET /api/recipes/{id}` uses property **`recipeIngredients`** (array of `RecipeIngredientResponse`).
- Each line includes **`ingredient`** (nested): `name`, `kcalPer100g`, `proteinPer100g`, `carbsPer100g`, `fatPer100g`, `unitType`, `pieceWeightGrams`, plus line `quantity`, `unit`, `optional`, and line totals `kcal`, `protein`, `carbs`, `fat`.
- **`macros`** on the recipe root and **`GET /api/recipes/{id}/macros`** use the same JSON object: `{ "kcal": number, "protein": number, "carbs": number, "fat": number }` (camelCase only).

**Macro calculation (per recipe, per serving):**

- GRAMS: `macro = (ingredient.macroPer100g / 100) × quantity`
- PIECES: `macro = (ingredient.macroPer100g / 100) × (quantity × ingredient.pieceWeightGrams)`
- Recalculate on every `RecipeIngredient` save/update (and after image upload). `GET /api/recipes/{id}/macros` reads fresh DB state each request — no response caching.

---

### Meal Plans

```java
MealPlan {
    Long id
    String name
    int daysCount                  // default 7, range 1–14
    LocalDate startDate
    List<Long> userProfileIds
    LocalDateTime createdAt
}

MealPlanDay {
    Long id
    Long mealPlanId
    int dayNumber                  // 1..daysCount
}

MealPlanEntry {
    Long id
    Long mealPlanDayId
    Long userProfileId
    Long recipeId
    MealType mealType
    int mealsPerDay                // 1–10, persisted — used in scaling + profile refresh
    double scalingFactor
    int calculatedKcal
    double calculatedProtein
    double calculatedCarbs
    double calculatedFat
}
```

**Portion logic**

A meal is planned exactly as its recipe is written. **Nothing is scaled on the user's behalf.**

```
scalingFactor = request.scalingFactor, or 1.0 when absent

For each RecipeIngredient:
  scaledQuantity = quantity × scalingFactor

For PIECE ingredients:
  scaledQuantity = round to nearest integer, minimum 1
```

`scalingFactor` is accepted on entry create/update (range 0.1–10.0) and persisted, so a portion is
always a choice someone made rather than something the app inferred. A day total is therefore the sum
of what is actually planned, and may legitimately sit under or over the profile's target.

Earlier versions derived the factor automatically as `calculatedKcal / mealsPerDay / recipe.totalKcal`,
forcing every entry — snacks included — onto an identical calorie figure. That is gone: it silently
multiplied ingredient quantities (a 192 kcal snack became 920 kcal, i.e. 120 g of whey and 720 g of
kiwi) and, because `mealsPerDay` defaulted to 3 while the planner shows four meal rows, it overshot
the daily target by a third.

`mealsPerDay` is still stored on the entry, but only the explicit fit-to-target action reads it.

When a **UserProfile** is updated, **MealPlanEntry** macro totals are recomputed from the recipe's
current ingredients, keeping each entry's stored `scalingFactor`. Editing a profile never re-portions
meals that are already planned.

---

### Shopping List

```java
ShoppingList {
    Long id
    String name
    LocalDate dateRangeStart
    LocalDate dateRangeEnd
    List<Long> mealPlanIds
}

ShoppingListItem {
    Long id
    Long shoppingListId
    Long ingredientId
    Map<Long, Double> quantityPerMealPlan   // mealPlanId → grams or pieces
    double totalQuantity
    String displayUnit             // "g" / "kg" / "kom"
    IngredientCategory category
}
```

**Aggregation:** scale recipe ingredients per entry, sum by ingredient across plans/days; display kg if ≥ 1000 g (weight units); group by category for PDF/UI.

---

## API Endpoints (implemented)

### Profiles

```
GET    /api/profiles                       — list all profiles
GET    /api/profiles/{id}                  — one profile (for edit screen)
POST   /api/profiles                       — create (returns calculatedKcal, targets, goal)
PUT    /api/profiles/{id}                  — update (recalculates TDEE + macros)
DELETE /api/profiles/{id}
GET    /api/profiles/{id}/tdee             — bmr, tdee (maintenance), calculatedKcal (after goal),
                                            targetProtein/Carbs/Fat, goal, goalCalorieMultiplier, multipliers
POST   /api/profiles/tdee-preview          — same breakdown for unsaved form (JSON: gender, age, heightCm,
                                            weightKg, activityLevel, goal, proteinMultiplier, fatMultiplier; no displayName)
```

### Ingredients

```
GET    /api/ingredients?search={query}     — local DB search (omit param → all)
POST   /api/ingredients/import?query={q}   — OFF search + import (POST body empty)
POST   /api/ingredients                    — manual create
PUT    /api/ingredients/{id}
DELETE /api/ingredients/{id}
```

### Recipes

```
GET    /api/recipes?search=&mealType=      — list; each item: recipeIngredients, macros, imageFilename
GET    /api/recipes/{id}                   — detail + recipeIngredients (nested ingredient + line macros) + macros + imageFilename
GET    /api/recipes/{id}/macros            — { "kcal", "protein", "carbs", "fat" } only (camelCase numbers)
POST   /api/recipes
PUT    /api/recipes/{id}
DELETE /api/recipes/{id}
POST   /api/recipes/{id}/ingredients       — add line
PUT    /api/recipes/{id}/ingredients/{iid}
DELETE /api/recipes/{id}/ingredients/{iid}
POST   /api/recipes/{id}/image             — multipart; form field name **image**
```

### Meal plans

```
GET    /api/mealplans
POST   /api/mealplans                      — full body: name, startDate, daysCount (default 7), userProfileIds
GET    /api/mealplans/{id}
PUT    /api/mealplans/{id}                 — partial update: daysCount, startDate, name, userProfileIds; expanding daysCount creates new day rows
DELETE /api/mealplans/{id}
POST   /api/mealplans/{id}/days/{day}/entries
PUT    /api/mealplans/{id}/days/{day}/entries/{eid}
DELETE /api/mealplans/{id}/days/{day}/entries/{eid}
GET    /api/mealplans/{id}/summary
```

### Shopping lists

```
GET    /api/shopping                       — list summaries (id, name, dates, mealPlanIds, totalItems) — no line items
POST   /api/shopping                       — generate from mealPlanIds[] (+ optional name)
GET    /api/shopping/{id}                  — full list + items
GET    /api/shopping/{id}/grouped          — by category
DELETE /api/shopping/{id}
```

### PDF

```
GET    /api/pdf/mealplan/{mealPlanId}/day/{dayNumber}
GET    /api/pdf/mealplan/{mealPlanId}/full
GET    /api/pdf/shopping/{shoppingListId}
```

Responses use `Content-Type: application/pdf` and `Content-Disposition: attachment`.

---

## Package structure (backend)

```
com.mealplanner
├── config/
│   ├── WebClientConfig.java       ← openFoodFactsWebClient + baseUrl + User-Agent
│   └── WebMvcConfig.java          ← /uploads/** static mapping
├── profile/
│   ├── UserProfileController.java, UserProfileService.java
│   ├── TDEECalculator.java, TdeePreviewRequest.java, …
├── ingredient/
│   └── openff/
│       ├── OpenFoodFactsClient.java
│       └── OpenFoodFactsMapper.java
├── recipe/
├── mealplan/
│   └── MealPlanUpdateRequest.java  ← partial PUT body for meal plans
├── shopping/
├── pdf/
└── common/
```

---

## Key dependencies (`pom.xml`)

```text
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-boot-starter-validation
spring-boot-starter-webflux        ← WebClient for OFF
postgresql, flyway-core
itext7 9.x (PDF)
lombok
spring-boot-starter-test, h2 (test)
```

No `spring-boot-starter-security`, no JJWT — API is open by design for this household deployment.

---

## Database migrations (Flyway)

See `src/main/resources/db/migration/`. Notable: **V10** standalone profiles (no `users` FK) and **`meals_per_day`** on meal plan entries.

---

## Configuration / environment

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/mealplanner
spring.servlet.multipart.enabled=true
app.upload.dir=./uploads
open-food-facts.base-url=https://world.openfoodfacts.org
open-food-facts.user-agent=MealPlanner/1.0 (identify your app — required by OFF)
```

Use `application-local.properties` for secrets (not committed). No JWT variables.

---

## Business rules

1. **PIECE rounding (scaling):** nearest integer, **minimum 1**.
2. **Recipe macros:** recalculate on every `RecipeIngredient` change. **Deleting a recipe** deletes every `MealPlanEntry` that referenced it, removes `{id}.jpg` if present, then deletes the recipe (`recipe_ingredients` cascade in DB).
3. **Portion factor:** defaults to **1.0** — the recipe as written. Set explicitly per entry (0.1–10.0) and persisted. Never derived from the profile, and never changed behind the user's back.
4. **Shopping list:** aggregate same ingredient across plans; no duplicate rows.
5. **`manualOverride`:** block OFF overwrite of nutrition fields.
6. **Meal plan `daysCount`:** 1–14; **PUT** may send only `{ "daysCount": N }` (partial update).
7. **Profiles:** `calculatedKcal` is always post-goal; carbs use goal-adjusted budget.
8. **No auth:** all endpoints open on the LAN.

---

## Open items / decisions

- [x] **Auth:** none — optional JWT/household login could be added later without changing core DTOs; current backend has no Security filter chain.
- [x] **Profiles:** standalone rows; UI profile switcher is client-only.
- [x] **PDF / images:** attachment download; recipe images as `uploads/recipes/{recipeId}.jpg`.
- [ ] **Recipe `imageFilename` on API:** future enhancement if multiple extensions or CDN paths are needed.
- [ ] Barcode: e.g. `POST /api/ingredients/import?barcode=` — deferred.
- [ ] AI meal generation — deferred.

---

---

# Part B — Frontend

> **Target:** Desktop + iPad (landscape). Light theme. **UI language:** English.

## Tech stack

```text
react 18, vite, typescript
tailwindcss, shadcn/ui
@tanstack/react-query, react-router-dom v6
@dnd-kit/core, @dnd-kit/sortable
react-hook-form, zod
axios                    ← baseURL from VITE_API_URL (no auth headers in household mode)
react-dropzone           ← recipe image upload; multipart field name **image** (matches Spring @RequestParam)
sonner                   ← toasts (used by every mutation hook)
vite-plugin-pwa          ← offline shopping list

Not installed despite what older drafts claimed: **recharts**. There is no charting library in
`package.json`; macro visuals are hand-rolled (`MacroBar`, `MacroChips`). Do not import it without
adding the dependency first.
```

**Household deploy:** app may open directly on **Dashboard** with no login. `VITE_API_URL` points at the API (e.g. `http://localhost:8080`). Recipe images: `{baseURL}/uploads/recipes/{imageFilename}` from the recipe DTO. Do **not** set `Content-Type: multipart/form-data` manually on upload — let the browser set the boundary.

---

## Design system

### Colors

```css
--background:     #FAFAF8
--surface:        #FFFFFF
--surface-muted:  #F4F4F1
--border:         #E5E5E0
--text-primary:   #1A1A18
--text-secondary: #6B6B63
--text-muted:     #9E9E95

--accent:         #2D6A4F
--accent-light:   #D8F3DC
--accent-hover:   #245A42

--breakfast:      #F4A261
--lunch:          #2D6A4F
--dinner:         #264653
--snack:          #E9C46A

--macro-protein:  #E76F51
--macro-carbs:    #2A9D8F
--macro-fat:      #E9C46A
--macro-kcal:     #264653

--destructive:    #C0392B
--warning:        #F39C12
--success:        #27AE60
```

### Typography

```css
font-display: 'Fraunces'
font-body:    'DM Sans'
/* scale: xs … 4xl — see previous spec */
```

### Spacing, radius, shadows

4px grid; `--radius-sm` … `--radius-xl`; `--shadow-card`, `--shadow-hover`, `--shadow-modal`.

---

## Routing

```text
/                    → /dashboard
/dashboard
/recipes, /recipes/new, /recipes/:id, /recipes/:id/edit
/planner, /planner/:mealPlanId
/shopping, /shopping/:id
/ingredients
/profiles, /profiles/new, /profiles/:id/edit
/settings
```

---

## Layout

- **Shell:** fixed sidebar ~240px (icons ~64px on iPad), main content max-width ~1200px.
- **Nav:** Dashboard, Recipes, Meal Planner, Shopping, Ingredients, Profiles, Settings.
- **Bottom of sidebar:** profile switcher (Petar / Ana) — **UI only**; maps to `UserProfile` ids in API calls.

---

## Pages (summary)

### 1. Dashboard `/dashboard`

- **Weekly overview (Mon–Sun), read-only** for the active profile — a grid of 7 day columns × meal-type
  rows, with today highlighted. It does not allow editing; every slot links into `/planner`.
- Macro totals per day vs the profile's goal-adjusted targets; quick actions (new recipe, planner, shopping).
- Implemented in `src/pages/Dashboard.tsx` on top of `lib/week-utils.ts` and `lib/dashboard-plan.ts`.

### 2. Recipes `/recipes`

- Debounced search, meal-type filter tabs, responsive cards (image from `/uploads/recipes/{id}.jpg` with on-error fallback), macro hints from list DTO if present.

### 3. Recipe detail `/recipes/:id`

- Prefer **`GET …/macros`** or root **`macros`** for header totals; table uses nested **`ingredient`** + per-line macros on each `recipeIngredients[]` row.

### 4. Recipe form

- Sections: basic info, image (**multipart field `image`**), ingredients (local search + OFF import), live macro preview.

### 5. Meal planner `/planner`

- Days 1–14 via **`PUT /api/mealplans/{id}`** with partial body `{ "daysCount": N }` when changing length.
- Drag-and-drop assign; optimistic updates; resolve recipe title from **`GET /api/recipes`** when plan entry lacks embedded name.
- Footer macros vs **goal-adjusted** profile targets.

### 6. Shopping `/shopping`

- **List:** `GET /api/shopping` for cards (summary). **Detail:** `GET /api/shopping/{id}` or `/grouped`; PDF via `/api/pdf/shopping/{id}`.

### 7. Ingredients `/ingredients`

- Table, filters, OFF import tab; empty OFF results may mean OFF 503 — show manual-add path.

### 8. Profiles `/profiles` and edit

- **Live preview:** debounced **`POST /api/profiles/tdee-preview`**; display **`calculatedKcal`**, **`targetProtein`**, **`targetCarbs`**, **`targetFat`** — not maintenance **`tdee`** as daily calories (optional subtitle “Maintenance ~X kcal”).
- Goals as uppercase enums: `CUT`, `MAINTAIN`, `BULK`.
- On save, refresh from **POST/PUT** response.

---

## Shared components

Actual files under `src/components/`:

```text
layout/ShellLayout.tsx
shared/  MacroBar, MacroChips, MealTypeChip, RecipeCard, IngredientSearch, ProfileSwitcher
planner/ PlannerGrid, PlannerToolbar, PlannerWeekActionDialog, RecipeSidebar, RecipeQuickModal, MacroFooter
shopping/GenerateShoppingModal
ui/      button, dialog, input, label, slide-over, textarea   ← the only shadcn primitives vendored so far
```

There is no `PlannerSlot` component — slot rendering lives inside `PlannerGrid`. When a UI primitive is
missing from `ui/`, vendor the shadcn one rather than hand-rolling it.

---

## State management

```text
Server state:   TanStack Query
UI / forms:     useState, react-hook-form + zod
DnD:            @dnd-kit
```

**Query keys (illustrative)**

```ts
['recipes']
['recipes', id]
['recipes', id, 'macros']
['mealplans']
['mealplans', id]
['mealplans', id, 'summary']
['ingredients']
['shopping']                      // list GET /api/shopping
['shopping', id]
['profiles']
['profiles', id]
['profiles', id, 'tdee']
['profiles', 'tdee-preview', …]   // debounced preview payload hash
```

---

## API integration (axios)

```ts
const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
const api = axios.create({ baseURL });

// If JWT auth is added later:
// api.interceptors.request.use(cfg => { const t = localStorage.getItem('token'); … });
```

Recipe image URL: `` `${baseURL}/uploads/recipes/${encodeURIComponent(imageFilename)}` `` (from API `imageFilename`; cache-bust after upload if needed).

---

## Frontend project structure

```text
src/
├── api/           recipes.ts, ingredients.ts, mealplans.ts, shopping.ts, profiles.ts
├── components/ui/, components/shared/
├── pages/         Dashboard, Recipes/*, Planner/*, Shopping/*, Ingredients/*, Profiles/*
├── hooks/
├── lib/
│   ├── utils.ts
│   ├── macros.ts        ← defensive client math; trust GET …/macros for recipe totals
│   ├── recipe-image.ts  ← resolve URL for /uploads/recipes/{id}.jpg
│   └── planner.ts       ← slots, drag ids, day totals
├── types/
└── main.tsx
```

---

## UX rules

1. Macro totals live — no manual “recalculate” for recipes.
2. DnD is primary for planner; obvious drop targets.
3. Profile switcher always visible.
4. Actionable empty states.
5. PDF opens new tab / download, non-blocking.
6. Optimistic mutations with toast rollback.
7. iPad: icon sidebar, horizontal scroll for many days, ≥44px touch targets.
8. Recipe grid: no pagination (small library).

---

## Decisions (closed)

- [x] **Backend:** no auth; standalone profiles; goal-adjusted `calculatedKcal`; partial meal plan PUT; shopping list GET; OFF User-Agent + retries.
- [x] **Images:** `{id}.jpg` under `/uploads/recipes/`; DTO **`imageFilename`**; upload field **`image`**; `/uploads/**` static.
- [x] **PDF:** `Content-Disposition: attachment`.
- [x] **PWA / offline shopping** (optional): `vite-plugin-pwa` — cache shopping route for store use.
