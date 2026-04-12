# Meal Planner App — Backend Specification

> **Stack**: Spring Boot 3.x | PostgreSQL | Java 21 | Maven  
> **Status**: Planning + implementation reference — backend and frontend should stay aligned with this document.  
> **Last updated**: 2026-04-06

---

## Project Overview

A meal planning application for two users (Petar + wife) that:
- Calculates TDEE and macro targets per user via profile input
- Stores ingredients with nutritional data (Open Food Facts API + manual)
- Manages recipes with per-ingredient quantities (grams or pieces)
- Generates meal plans for 1–N days (default 3), scaled per user profile
- Auto-calculates macros/calories when recipes or quantities are modified
- Generates shopping lists covering multiple meal plans (e.g. 2 × 3-day = 6 days)
- Exports daily meal plan as PDF (1 day = 1 A4 page, designed for print)

---

## Domain Model

### User & Profile

```java
// User — authentication entity
User {
    Long id
    String email
    String name
    String passwordHash
    LocalDateTime createdAt
}

// UserProfile — nutritional and physical data
UserProfile {
    Long id
    Long userId                    // FK → User
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

**TDEE Logic (Mifflin-St Jeor):**
```
BMR (male)   = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
BMR (female) = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161

Activity multipliers:
  SEDENTARY    = 1.2
  LIGHT        = 1.375
  MODERATE     = 1.55
  ACTIVE       = 1.725
  VERY_ACTIVE  = 1.9

maintenanceTDEE = round(BMR × activityMultiplier)

Goal calorie multipliers (applied after maintenance TDEE):
  CUT      = maintenanceTDEE × 0.85   (−15%)
  MAINTAIN = maintenanceTDEE × 1.0
  BULK     = maintenanceTDEE × 1.125 (+12.5%)

calculatedKcal = round(goal-adjusted calories)

Macro split (per kg bodyweight from profile; carbs fill the remainder):
  Protein (g) = proteinMultiplier × weightKg
  Fat (g)     = fatMultiplier × weightKg
  Carbs (g)   = (calculatedKcal − protein×4 − fat×9) / 4   // uses goal-adjusted kcal, not maintenance TDEE
```

**API:** `POST /api/profiles/tdee-preview` accepts the same body fields as create/update (no `displayName`) and returns the same breakdown shape as `GET /api/profiles/{id}/tdee` so the frontend can preview CUT/MAINTAIN/BULK before save without duplicating this math client-side.

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
    boolean manualOverride         // if true, OFF sync is disabled for this ingredient
}
```

**Open Food Facts Integration:**
- Search endpoint: `GET https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&json=1`
- Product lookup: `GET https://world.openfoodfacts.org/api/v2/product/{barcode}`
- No auth required
- Cache results locally — do not re-fetch if already in DB
- Fields to extract: `product_name`, `nutriments.energy-kcal_100g`, `nutriments.proteins_100g`, `nutriments.carbohydrates_100g`, `nutriments.fat_100g`, `nutriments.fiber_100g`
- Allow manual override of any field after import

---

### Recipes

```java
Recipe {
    Long id
    String name
    MealType mealType              // BREAKFAST / LUNCH / DINNER / SNACK
    String description
    Integer prepTimeMin
    String imageFilename           // nullable — stored file name under /uploads/recipes/
    LocalDateTime createdAt
    LocalDateTime updatedAt
}

RecipeIngredient {
    Long id
    Long recipeId                  // FK → Recipe
    Long ingredientId              // FK → Ingredient
    double quantity                // number of units
    QuantityUnit unit              // GRAMS / PIECES
    boolean optional
    // DTO responses should include either:
    // - nested Ingredient (full macros, camelCase or snake_case), and/or
    // - ingredientName for display when the nested object is omitted
}
```

**Macro Calculation (per recipe, per serving):**
- For GRAMS: `macro = (ingredient.macroPer100g / 100) × quantity`
- For PIECES: `macro = (ingredient.macroPer100g / 100) × (quantity × ingredient.pieceWeightGrams)`
- Total recipe macros = sum across all RecipeIngredients
- Recalculate on every RecipeIngredient save/update — expose via `GET /recipes/{id}/macros`

---

### Meal Plans

```java
MealPlan {
    Long id
    String name
    int daysCount                  // default 3, configurable
    LocalDate startDate
    List<Long> userProfileIds      // profiles included in this plan
    LocalDateTime createdAt
}

MealPlanDay {
    Long id
    Long mealPlanId                // FK → MealPlan
    int dayNumber                  // 1..daysCount
}

MealPlanEntry {
    Long id
    Long mealPlanDayId             // FK → MealPlanDay
    Long userProfileId             // FK → UserProfile
    Long recipeId                  // FK → Recipe
    MealType mealType              // BREAKFAST / LUNCH / DINNER / SNACK
    double scalingFactor           // calculated — see below
    // Stored after calculation:
    int calculatedKcal
    double calculatedProtein
    double calculatedCarbs
    double calculatedFat
    // Optional embedded recipe summary for UI (name, imageFilename, etc.) —
    // frontend also resolves display name from GET /api/recipes when this is missing (e.g. optimistic updates).
}
```

**Scaling Logic:**
```
mealKcalTarget = userProfile.calculatedKcal / numberOfMealsPerDay

scalingFactor = mealKcalTarget / recipe.totalKcal

For each RecipeIngredient:
  scaledQuantity = quantity × scalingFactor

For PIECE ingredients:
  scaledQuantity = round(scaledQuantity)   // never 0.7 of a tortilla
  // If round() changes macros significantly, flag to frontend
```

---

### Shopping List

```java
ShoppingList {
    Long id
    String name
    LocalDate dateRangeStart
    LocalDate dateRangeEnd
    List<Long> mealPlanIds         // can reference 2 meal plans (e.g. 2 × 3 days)
}

ShoppingListItem {
    Long id
    Long shoppingListId            // FK → ShoppingList
    Long ingredientId              // FK → Ingredient
    // Breakdown per meal plan (for display):
    Map<Long, Double> quantityPerMealPlan   // mealPlanId → grams/pieces
    double totalQuantity
    String displayUnit             // "g" / "kg" / "kom" / "ml"
    IngredientCategory category    // for grouping on PDF
}
```

**Aggregation Logic:**
- For each MealPlan → for each MealPlanEntry → scale RecipeIngredients → sum by ingredient
- Quantities in grams unless `unitType = PIECE` → display as pieces
- If total grams ≥ 1000 → convert to kg on display
- Group by category for PDF output

---

## API Endpoints

### Users & Profiles
```
POST   /api/users                          — register (optional for household deploy without auth)
POST   /api/auth/login                     — login (JWT) — optional if app runs without auth
GET    /api/profiles                       — list profiles for current user
POST   /api/profiles                       — create profile (returns calculatedKcal, targets, goal)
PUT    /api/profiles/{id}                  — update (recalculates TDEE + macros on save)
GET    /api/profiles/{id}/tdee             — TDEE breakdown: bmr, tdee (maintenance), activityMultiplier,
                                            calculatedKcal (after goal), targetProtein/Carbs/Fat, goal, goalCalorieMultiplier
POST   /api/profiles/tdee-preview          — same breakdown as above for unsaved form values (JSON body: gender, age,
                                            heightCm, weightKg, activityLevel, goal, proteinMultiplier, fatMultiplier; no displayName)
```

### Ingredients
```
GET    /api/ingredients?search={query}     — search local DB
POST   /api/ingredients/import?query={q}  — search OFF API + import to DB
POST   /api/ingredients                   — manual create
PUT    /api/ingredients/{id}              — update / manual override
DELETE /api/ingredients/{id}
```

### Recipes
```
GET    /api/recipes                        — list; include imageFilename + optional macro summary when available
GET    /api/recipes/{id}                   — detail; recipeIngredients (alias ingredients) with nested ingredient DTOs
GET    /api/recipes/{id}/macros            — { kcal, protein, carbs, fat } (numbers; used by recipe detail + modals)
POST   /api/recipes
PUT    /api/recipes/{id}
DELETE /api/recipes/{id}
POST   /api/recipes/{id}/image             — multipart file upload (frontend uses form field `image`; Spring must use the same @RequestParam name)
POST   /api/recipes/{id}/ingredients       — add ingredient
PUT    /api/recipes/{id}/ingredients/{iid}
DELETE /api/recipes/{id}/ingredients/{iid}
```

### Meal Plans
```
GET    /api/mealplans
POST   /api/mealplans                     — create with daysCount + profileIds
GET    /api/mealplans/{id}
PUT    /api/mealplans/{id}
DELETE /api/mealplans/{id}
POST   /api/mealplans/{id}/days/{day}/entries     — assign recipe to day/meal
PUT    /api/mealplans/{id}/days/{day}/entries/{eid}
DELETE /api/mealplans/{id}/days/{day}/entries/{eid}
GET    /api/mealplans/{id}/summary        — full breakdown per user per day
```

### Shopping Lists
```
POST   /api/shopping                      — generate from mealPlanIds[]
GET    /api/shopping/{id}
GET    /api/shopping/{id}/grouped         — grouped by category
DELETE /api/shopping/{id}
```

### PDF Export
```
GET    /api/pdf/mealplan/{mealPlanId}/day/{dayNumber}   — 1 A4 per day
GET    /api/pdf/shopping/{shoppingListId}               — shopping list PDF
```

---

## Package Structure

```
com.mealplanner
├── config/
│   ├── SecurityConfig.java
│   └── WebClientConfig.java
├── user/
│   ├── UserController.java
│   ├── UserService.java
│   └── UserRepository.java
├── profile/
│   ├── UserProfileController.java
│   ├── UserProfileService.java
│   ├── TDEECalculator.java        ← pure static utility, unit-testable
│   └── UserProfileRepository.java
├── ingredient/
│   ├── IngredientController.java
│   ├── IngredientService.java
│   ├── IngredientRepository.java
│   └── openff/
│       ├── OpenFoodFactsClient.java   ← WebClient wrapper
│       └── OpenFoodFactsMapper.java   ← maps OFF response → Ingredient
├── recipe/
│   ├── RecipeController.java
│   ├── RecipeService.java             ← includes macro recalculation
│   ├── RecipeRepository.java
│   ├── RecipeIngredientRepository.java
│   └── MacroCalculator.java           ← pure utility
├── mealplan/
│   ├── MealPlanController.java
│   ├── MealPlanService.java
│   ├── ScalingCalculator.java         ← scaling + piece rounding logic
│   ├── MealPlanRepository.java
│   └── MealPlanEntryRepository.java
├── shopping/
│   ├── ShoppingListController.java
│   ├── ShoppingListService.java       ← aggregation logic
│   └── ShoppingListRepository.java
├── pdf/
│   ├── PdfController.java
│   ├── MealPlanPdfService.java        ← iText 7, A4 daily layout
│   └── ShoppingListPdfService.java
└── common/
    ├── enums/
    │   ├── Gender.java
    │   ├── ActivityLevel.java
    │   ├── Goal.java
    │   ├── MealType.java
    │   ├── UnitType.java
    │   ├── QuantityUnit.java
    │   ├── IngredientSource.java
    │   └── IngredientCategory.java
    └── exception/
        ├── GlobalExceptionHandler.java
        └── ResourceNotFoundException.java
```

---

## Key Dependencies (pom.xml)

```xml
<!-- Spring -->
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-boot-starter-security
spring-boot-starter-validation
spring-boot-starter-webflux        <!-- WebClient for OFF API -->

<!-- DB -->
postgresql
flyway-core                        <!-- DB migrations -->

<!-- Auth -->
jjwt-api / jjwt-impl / jjwt-jackson

<!-- PDF -->
itext7-core                        <!-- com.itextpdf, version 7.x -->

<!-- Utilities -->
lombok
mapstruct

<!-- Test -->
spring-boot-starter-test
h2 (test scope)
```

---

## Database Migrations (Flyway)

Order of creation:
1. `V1__create_users.sql`
2. `V2__create_user_profiles.sql` — include `goal`, `protein_multiplier`, `fat_multiplier`, calculated macro columns
3. `V3__create_ingredients.sql`
4. `V4__create_recipes.sql` — include `image_filename` (nullable) when using file-based images
5. `V5__create_recipe_ingredients.sql`
6. `V6__create_meal_plans.sql`
7. `V7__create_meal_plan_days_entries.sql`
8. `V8__create_shopping_lists.sql`

---

## Environment Variables

```properties
# application.properties / env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/mealplanner
SPRING_DATASOURCE_USERNAME=
SPRING_DATASOURCE_PASSWORD=
JWT_SECRET=
JWT_EXPIRATION_MS=86400000

# No API key needed for Open Food Facts
OPEN_FOOD_FACTS_BASE_URL=https://world.openfoodfacts.org
```

**Frontend (`.env`):**
```properties
# API origin; trailing slash optional. Empty = same origin (use Vite proxy in dev).
VITE_API_URL=http://localhost:8080
```

---

## Business Rules (enforce in service layer)

1. **PIECE rounding**: When scaling a recipe, PIECE ingredients are always rounded to nearest integer. Minimum 1 — never 0.
2. **Macro recalculation**: Always triggered on RecipeIngredient save/update. Never stale.
3. **Scaling factor**: Derived from `userProfile.calculatedKcal` (**goal-adjusted** daily target) / `mealsPerDay` / `recipe.totalKcal`. Not stored permanently — recalculated if profile or recipe totals change.
4. **Shopping list aggregation**: Same ingredient across multiple recipes/days is summed, not duplicated.
5. **manualOverride flag**: If set on Ingredient, Open Food Facts re-import does not overwrite nutritional values.
6. **MealPlan daysCount**: Default 3, range 1–14. Shopping list can span multiple meal plans.

---

## Open Items / Decisions

- [x] **Auth strategy**: JWT stateless when auth is enabled — single household account, two profiles under one User. Frontend may run **without** login (no JWT) for local/household deploy; same API contracts apply.
- [x] **Multi-user access**: one shared account. UserProfile switcher is UI-only — no separate credentials for wife.
- [x] **PDF**: direct download via `Content-Disposition: attachment`. No preview endpoint needed.
- [x] **Image storage**: local filesystem. Spring Boot serves `/uploads/recipes/**` as static resources. Persist a stored **filename** (e.g. UUID + extension) on `Recipe.imageFilename`; legacy installs may still use `{recipeId}.jpg`. Frontend builds absolute URLs as `VITE_API_URL + /uploads/recipes/{filename}` (empty `VITE_API_URL` → same origin, e.g. Vite proxy).
- [ ] Barcode scanning: deferred — add as `POST /api/ingredients/import?barcode={code}` later
- [ ] AI meal generation: deferred — Claude API call via `RestClient` when needed

---

# Meal Planner App — Frontend Specification

> **Stack**: React 18 + Vite | shadcn/ui | TailwindCSS | TanStack Query | React Router v6  
> **Target**: Desktop browser + iPad (landscape). Light theme only.  
> **Language**: English UI  
> **Last updated**: 2026-04-06

---

## Tech Stack

```
react 18
vite
typescript
tailwindcss
shadcn/ui                  — component library
@tanstack/react-query      — server state, caching, mutations
react-router-dom v6        — routing
@dnd-kit/core              — drag and drop (meal planner)
@dnd-kit/sortable
react-hook-form            — all forms
zod                        — schema validation
axios                      — HTTP client; baseURL from VITE_API_URL (optional JWT interceptor if auth enabled)
recharts                   — macro charts on dashboard
react-dropzone             — image upload on recipe forms
```

**Household deploy (current frontend):** app can open straight to the dashboard with **no login page**; `VITE_API_URL` points at the API host (e.g. `http://localhost:8080`). Static recipe images use the same base: `{VITE_API_URL}/uploads/recipes/{imageFilename}`. Do **not** set `Content-Type: multipart/form-data` manually on image upload — let the client set the multipart boundary.

---

## Design System

### Colors
```css
--background:     #FAFAF8       /* warm off-white, not pure white */
--surface:        #FFFFFF
--surface-muted:  #F4F4F1
--border:         #E5E5E0
--text-primary:   #1A1A18
--text-secondary: #6B6B63
--text-muted:     #9E9E95

--accent:         #2D6A4F       /* deep forest green — food/health feel */
--accent-light:   #D8F3DC
--accent-hover:   #245A42

--breakfast:      #F4A261       /* warm orange */
--lunch:          #2D6A4F       /* forest green */
--dinner:         #264653       /* dark teal */
--snack:          #E9C46A       /* warm yellow */

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
font-display: 'Fraunces'        /* Google Fonts — serif, editorial, food magazine feel */
font-body:    'DM Sans'         /* clean, modern, readable at small sizes */

/* Scale */
--text-xs:   0.75rem
--text-sm:   0.875rem
--text-base: 1rem
--text-lg:   1.125rem
--text-xl:   1.25rem
--text-2xl:  1.5rem
--text-3xl:  1.875rem
--text-4xl:  2.25rem
```

### Spacing & Radius
```css
/* 4px base grid */
--radius-sm:  6px
--radius-md:  10px
--radius-lg:  16px
--radius-xl:  24px
```

### Shadows
```css
--shadow-card:  0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)
--shadow-hover: 0 4px 16px rgba(0,0,0,0.10)
--shadow-modal: 0 20px 60px rgba(0,0,0,0.15)
```

---

## Routing Structure

```
/                          → redirect → /dashboard
/dashboard                 → Dashboard
/recipes                   → Recipe Library
/recipes/new               → Create Recipe
/recipes/:id               → Recipe Detail
/recipes/:id/edit          → Edit Recipe
/planner                   → Meal Planner (drag & drop)
/planner/:mealPlanId       → Specific meal plan
/shopping                  → Shopping Lists
/shopping/:id              → Shopping List Detail
/ingredients               → Ingredient Manager
/profiles                  → User Profiles (Petar + wife)
/profiles/:id/edit         → Edit Profile
/settings                  → App Settings
```

---

## Layout

### Shell
```
┌─────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main content area │
│                         │                    │
│  Logo + app name        │  Page header       │
│  ─────────────────      │  ─────────────     │
│  Nav links              │  Page content      │
│                         │                    │
│  ─────────────────      │                    │
│  Profile switcher       │                    │
│  (Petar / Ana)          │                    │
└─────────────────────────────────────────────│
```

- Sidebar: fixed left, 240px, `--surface` background, subtle right border
- Active profile shown at bottom of sidebar — click to switch
- On iPad: sidebar collapses to icon-only (64px) with tooltip labels
- Main content: scrollable, max-width 1200px, centered with padding

### Sidebar Nav Items
```
🏠  Dashboard
🍽️  Recipes
📅  Meal Planner
🛒  Shopping Lists
🥕  Ingredients
👤  Profiles
⚙️  Settings
```

---

## Pages

---

### 1. Dashboard `/dashboard`

**Layout:** 2-column grid (left 60%, right 40%)

**Left column:**
- Today's meal plan for active profile
  - 4 rows: Breakfast / Lunch / Dinner / Snack
  - Each row: recipe image thumbnail + name + kcal + macros chips
  - If no meal planned: dashed empty slot with "+ Add" button
- Quick action buttons: "New Recipe", "Open Planner", "Generate Shopping List"

**Right column:**
- **Macro Summary Card** — active profile's daily targets vs actuals
  - 4 horizontal progress bars: Protein / Carbs / Fat / Kcal
  - Color coded: `--macro-protein`, `--macro-carbs`, etc.
  - Shows `actual / target` as text (e.g. "142g / 180g")
- **Profile toggle** — pill tabs "Petar / Ana" — switches all dashboard data
- **Upcoming meal preps** — next 3 meal plan days, compact list

---

### 2. Recipe Library `/recipes`

**Header:**
- Title "Recipes"
- Search input (debounced, 300ms)
- Filter tabs: `All | Breakfast | Lunch | Dinner | Snack` (pill style, accent color active)
- "+ New Recipe" button (primary, top right)

**Grid:** responsive card grid
- Desktop: 4 columns
- iPad: 3 columns
- Card:
  ```
  ┌──────────────────┐
  │  Recipe image    │  ← 16:9, object-cover, rounded top
  │  (full width)    │
  ├──────────────────┤
  │  Meal type badge │  ← colored chip (Breakfast/Lunch/etc.)
  │  Recipe name     │  ← Fraunces font, 1.1rem
  │  Kcal  Protein   │  ← small muted text
  └──────────────────┘
  ```
- Hover: card lifts (shadow-hover), subtle scale 1.02
- Click → `/recipes/:id`

---

### 3. Recipe Detail `/recipes/:id`

**Two-column layout:**

**Left (55%):**
- Full recipe image (aspect ratio 4:3, rounded)
- Below image: meal type badge + prep time
- Recipe name (Fraunces, large)
- Description paragraph
- Macro summary bar (4 values inline: kcal / protein / carbs / fat)

**Right (45%):**
- **Ingredients table**
  ```
  Ingredient     | Qty    | Unit  | Kcal  | P   | C   | F
  ───────────────┼────────┼───────┼───────┼─────┼─────┼───
  Chicken breast | 200    | g     | 220   | 44g | 0g  | 5g
  Tortilla       | 1      | piece | 150   | 4g  | 28g | 3g
  ```
- Totals row at bottom, bold
- Ingredient column: prefer nested `ingredient.name`, then flat `ingredientName` from API if the nested DTO is omitted
- Recipe-level macro summary: prefer `GET /api/recipes/{id}/macros`; client-side row sums require complete per-ingredient nutrition on each line
- "Edit Recipe" button → `/recipes/:id/edit`
- "Add to Planner" button → opens modal with link to planner (drag-and-drop is primary)

---

### 4. Recipe Form `/recipes/new` and `/recipes/:id/edit`

**Single page form, sections:**

**Section 1 — Basic Info**
- Name (text input)
- Meal type (segmented control: Breakfast / Lunch / Dinner / Snack)
- Prep time (number input, minutes)
- Description (textarea)

**Section 2 — Image Upload**
- Drag & drop zone (react-dropzone)
- Preview thumbnail on upload
- "Remove" button if image exists

**Section 3 — Ingredients**
- Search ingredient input → typeahead dropdown (searches local DB + OFF import)
  - Dropdown item shows: name + source badge (OFF / Manual)
  - "+ Import from Open Food Facts" option if no local match
- Ingredient row (added):
  ```
  [Ingredient name]  [Quantity input]  [Unit: g / pieces]  [×]
  ```
- Live macro recalculation — updates totals as user types quantity
- Macro totals bar at bottom of section, updates in real time

**Section 4 — Macro Preview**
- Card showing: total Kcal / Protein / Carbs / Fat
- 4 colored chips, updates live

**Actions:** "Save Recipe" (primary) | "Cancel" (ghost) | "Delete" (destructive, edit only)

---

### 5. Meal Planner `/planner`

**This is the core page — most complex UI.**

**Top bar:**
- Meal plan name (editable inline)
- Days selector: `< 3 days >` (arrows to change, range 1–14)
- Profile toggle: "Petar / Ana / Both" — switches whose macros are shown
- "Generate Shopping List" button
- "Export PDF" dropdown → per day or full plan

**Main area — drag & drop grid:**
```
         | Breakfast | Lunch | Dinner | Snack |
─────────┼───────────┼───────┼────────┼───────┤
 Day 1   │  [card]   │  [ ]  │ [card] │  [ ]  │
─────────┼───────────┼───────┼────────┼───────┤
 Day 2   │  [ ]      │[card] │  [ ]   │[card] │
─────────┼───────────┼───────┼────────┼───────┤
 Day 3   │  [card]   │  [ ]  │ [card] │  [ ]  │
```

- **Empty slot**: dashed border, "+ Add" label, droppable target
- **Filled slot**: recipe card (image + name + kcal)
  - Title uses **recipe name** from the loaded recipe list (`GET /api/recipes`) when the meal-plan entry does not yet embed a `recipe.name` (e.g. optimistic assign)
  - Drag handle top-right corner
  - Click → recipe detail modal (not navigation)
  - Hover actions: remove (×), swap (↕)

**Recipe sidebar panel (right, 280px):**
- Recipe library mini-view for dragging into slots
- Filter by meal type (tabs)
- Search input
- Scrollable list of recipe cards (draggable source)

**Macro footer bar (sticky bottom):**
```
Day 1 total:  Kcal 2180 / 2300  |  Protein 162g / 180g  |  Carbs 198g / 220g  |  Fat 65g / 70g
```
- Updates live as recipes are dropped in/out
- Color: green if within 5% of target, amber if ±10%, red if over

**DnD behavior (@dnd-kit):**
- Drag from sidebar → drop into empty grid slot
- Drag within grid → swap recipes between slots
- On drop: POST to backend, optimistic update on frontend
- On error: revert with toast notification

---

### 6. Shopping List `/shopping` and `/shopping/:id`

**List view `/shopping`:**
- Cards for each saved shopping list
- Shows: name, date range, number of ingredients, meal plans covered
- "Generate New" button → modal to select meal plans + date range

**Detail view `/shopping/:id`:**
- Header: list name + date range + "Export PDF" button
- Two panels side by side:
  - **Left: by meal plan** — shows quantities per menu (Menu A / Menu B)
  - **Right: total** — combined, grouped by ingredient category
- Category groups: 🥩 Meat | 🥛 Dairy | 🌾 Grains | 🥦 Produce | 🫙 Pantry
- Each item row:
  ```
  ☐  Chicken breast      400g  |  Menu A: 200g  Menu B: 200g
  ☐  Tortillas           6 pcs |  Menu A: 3     Menu B: 3
  ```
- Checkbox to mark as purchased (local state only, not persisted)
- "Print" button → opens PDF in new tab

---

### 7. Ingredient Manager `/ingredients`

**Table view:**
- Columns: Name | Category | Source | Kcal/100g | Protein | Carbs | Fat | Actions
- Sortable columns
- Search + filter by category + filter by source (OFF / Manual)
- Row actions: Edit | Delete
- "Add Ingredient" button → slide-over panel (not modal, not new page)
  - Form: name, category, unit type, piece weight (if PIECE), all macro fields
  - "Import from Open Food Facts" tab — search by name → select → review → save

---

### 8. Profiles `/profiles`

- Cards for each profile (Petar, Ana)
- Each card shows: name, stats summary (age/height/weight), calculated TDEE, macro targets
- "Edit" button → `/profiles/:id/edit`

**Profile Edit Form:**
- Display name, gender, age, height, weight
- Activity level (radio group with descriptions)
- Goal (Cut / Maintain / Bulk) — send uppercase enums (`CUT`, `MAINTAIN`, `BULK`)
- Protein and fat multipliers (g per kg bodyweight)
- **Live preview:** debounced `POST /api/profiles/tdee-preview` on field changes; show **calculatedKcal** (goal-adjusted) and macro targets from the response — do not treat maintenance **tdee** as the daily calorie target in preview (optional secondary line: “Maintenance ~X kcal”)
- On save: `POST`/`PUT` response updates cache; totals match preview for the same inputs
- Energy breakdown (saved profile) from `GET /api/profiles/{id}/tdee` when useful

---

## Shared Components

### MacroBar
```tsx
// 4 colored progress bars in a row
// Props: { actual: Macros, target: Macros, compact?: boolean }
```

### RecipeCard
```tsx
// Image + badge + name + kcal
// Props: { recipe, onClick, draggable? }
```

### MealTypeChip
```tsx
// Colored pill: Breakfast / Lunch / Dinner / Snack
// Color driven by MealType enum
```

### MacroChips
```tsx
// Inline row: P: 44g  C: 28g  F: 5g  Kcal: 320
// Props: { macros, size?: 'sm' | 'md' }
```

### IngredientSearch
```tsx
// Typeahead input with local DB + OFF import option
// Props: { onSelect: (ingredient) => void }
```

### PlannerSlot
```tsx
// Droppable grid cell
// States: empty (dashed) | filled (recipe card) | dragging-over (highlight)
```

### ProfileSwitcher
```tsx
// Pill toggle at sidebar bottom and planner top
// Props: { profiles, active, onChange }
```

---

## State Management

```
Server state:    TanStack Query (recipes, ingredients, meal plans, profiles)
UI state:        React useState / useReducer (filters, active profile, drag state)
Forms:           react-hook-form + zod
Auth token:      localStorage + axios interceptor
Drag state:      @dnd-kit internal (DndContext)
```

**Key query keys:**
```ts
['recipes']
['recipes', id]
['recipes', id, 'macros']
['mealplans']
['mealplans', id]
['mealplans', id, 'summary']
['ingredients']
['shopping', id]
['profiles']
['profiles', id]
['profiles', id, 'tdee']
['profiles', 'tdee-preview', ...payloadFields]   // debounced preview POST
```

---

## API Integration

```ts
// axios: baseURL = VITE_API_URL (trim trailing slash); empty string = same-origin + dev proxy
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '' });

// Optional JWT (when auth is enabled):
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) window.location.href = '/login';
    return Promise.reject(err);
  }
);

// Absolute URLs for uploads / PDF (same base as API):
// `${baseURL}/uploads/recipes/${encodeURIComponent(imageFilename)}`
```

---

## npm Scripts & Project Structure

```
src/
├── api/                    ← axios functions per domain
│   ├── recipes.ts
│   ├── ingredients.ts
│   ├── mealplans.ts
│   ├── shopping.ts
│   └── profiles.ts
├── components/
│   ├── ui/                 ← shadcn auto-generated
│   └── shared/             ← MacroBar, RecipeCard, etc.
├── pages/
│   ├── Dashboard.tsx
│   ├── Recipes/
│   │   ├── RecipeLibrary.tsx
│   │   ├── RecipeDetail.tsx
│   │   └── RecipeForm.tsx
│   ├── Planner/
│   │   ├── MealPlanner.tsx
│   │   ├── PlannerGrid.tsx
│   │   └── RecipeSidebar.tsx
│   ├── Shopping/
│   ├── Ingredients/
│   └── Profiles/
├── hooks/                  ← useRecipes, useMealPlan, useMacros, etc.
├── lib/
│   ├── utils.ts            ← shadcn utils + helpers
│   ├── macros.ts           ← client-side macro math for forms/lists (defensive; recipe totals also from GET .../macros)
│   ├── recipe-image.ts     ← resolveApiUrl + /uploads/recipes/{filename}
│   └── planner.ts          ← meal plan helpers (slots, totals, drag ids)
├── types/                  ← TypeScript types mirroring backend DTOs
└── main.tsx
```

---

## Key UX Rules

1. **Macro totals always live** — never require a "recalculate" button. Update on every ingredient quantity change.
2. **Drag & drop is the primary planner interaction** — clicking is secondary. Make drag targets obvious.
3. **Profile switcher is persistent** — always visible. Switching profile updates all macro displays instantly.
4. **Empty states are actionable** — every empty state has a CTA ("Add your first recipe", "+ Create meal plan").
5. **PDF export is non-blocking** — opens in new tab, never interrupts current workflow.
6. **Optimistic updates** — all drag/drop and form saves update UI immediately, rollback on error with toast.
7. **iPad layout** — sidebar collapses to icons. Planner grid scrolls horizontally if days > 5. Touch targets minimum 44px.
8. **No pagination on recipe grid** — virtual scroll or load-all (recipes will be < 100 total for this household use case).

---

## Decisions (closed)

- [x] **Recipe image storage**: local filesystem via Spring Boot static resources under `/uploads/recipes/`. API exposes `imageFilename` on recipe DTOs; frontend requests `{VITE_API_URL}/uploads/recipes/{filename}`. Fallback `{id}.jpg` acceptable for older data.
- [x] **PDF export**: direct download — `Content-Disposition: attachment`, no in-browser preview.
- [x] **Auth**: single shared household account. Two UserProfiles (Petar, Ana) under one User. Profile switcher = UI-only toggle, no separate login.
- [x] **Offline shopping list**: PWA — add `vite-plugin-pwa` + service worker. Shopping list route cached for offline use. Ingredient quantities readable without internet in store.