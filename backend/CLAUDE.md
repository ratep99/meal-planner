# Meal Planner — Backend

Read **meal-planner-spec.md** for full specification before doing anything.

**Stack:** Spring Boot 3.4.x, Java 17, PostgreSQL, Flyway, iText 7, Lombok, MapStruct  
**Package root:** `com.mealplanner`  
**DB:** PostgreSQL on localhost:5432/mealplanner  
**Config:** `application-local.properties` (not in git)

**Rules:**

- NO authentication, NO Spring Security, NO JWT — all endpoints open
- Always use Flyway for DB changes, never modify schema manually
- Macro recalculation triggers on every RecipeIngredient save
- PIECE ingredients round to nearest integer, minimum 1
- Image storage: local filesystem under `./uploads/recipes/` as `{recipeId}.jpg`; API field `imageFilename`; multipart param **`image`**
- Spring serves `/uploads/**` as static resource mapped to `./uploads/`
- UserProfiles are standalone — no User/auth entity
- `proteinMultiplier` and `fatMultiplier` are per-profile, defaults 2.0 and 0.8

---

# Meal Planner — Frontend

Read **meal-planner-spec.md** for full specification before doing anything.

**Stack:** React 18, TypeScript, Vite, shadcn/ui, TailwindCSS, TanStack Query, dnd-kit  
**API base:** `http://localhost:8080` (or `VITE_API_URL` in `.env`)

**Rules:**

- NO auth, NO login page — app opens directly to dashboard
- Macro totals always live — no recalculate buttons
- Optimistic updates on all mutations, rollback on error with toast
- Profile switcher is UI-only toggle, no re-login
- shadcn components only for UI primitives
- All types in `/src/types/` mirroring backend DTOs
- Profile edit form includes `proteinMultiplier` and `fatMultiplier` inputs
- Dashboard is weekly overview (Mon–Sun), read-only, links to planner
- Planner is always Mon–Sun view
- PDF / shopping list export requires profile + day selection dialog
- Ingredient form: added ingredients show as cards; search clears after add
- Recipe image `POST …/image`: multipart field name **`image`** (not `file`); use `imageFilename` from recipe DTO for `/uploads/recipes/…` URLs
