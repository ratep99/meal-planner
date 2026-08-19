# Meal Planner — Backend

Spring Boot API for household meal planning: profiles (TDEE), ingredients (incl. Open Food Facts), recipes, meal plans, shopping lists, PDF export.

**Specification:** [../docs/spec.md](../docs/spec.md) (backend + frontend UI spec — single source of truth).

**Checks:** `./scripts/check-backend.sh` from the repository root (runs `mvn test` in a JDK 17 container).

**Run:** `./mvnw spring-boot:run` (requires PostgreSQL and DB `mealplanner`). Use `application-local.properties` for credentials and overrides (not committed).

### Docker Compose (full stack, local dev)

From the **repository root** (parent of this directory):

```bash
docker compose up
```

See the root [README.md](../README.md) for setup, volume notes, and when to rebuild services.

Open the UI at `http://localhost:5173`.

## Profiles: calories and macros after a goal change

`POST /api/profiles` and `PUT /api/profiles/{id}` return `UserProfileResponse` with:

- **`calculatedKcal`** — rounded **daily calorie target after goal** (maintenance TDEE × goal factor: `CUT` 0.85, `MAINTAIN` 1.0, `BULK` 1.125).
- **`targetProtein`**, **`targetFat`** — from `proteinMultiplier` / `fatMultiplier` × body weight (unchanged by goal).
- **`targetCarbs`** — fills the remainder of that goal-adjusted budget (see spec).

Changing **`goal`** therefore changes **`calculatedKcal`** and usually **`targetCarbs`** on the same response.

`GET /api/profiles/{id}/tdee` returns **`TDEEResponse`**: **`tdee`** = maintenance (pre-goal); **`calculatedKcal`** = same post-goal target as above; **`goal`** and **`goalCalorieMultiplier`** describe the applied adjustment; macro fields match the profile.

**Live preview (no saved profile):** `POST /api/profiles/tdee-preview` with JSON body matching `TdeePreviewRequest` (`gender`, `age`, `heightCm`, `weightKg`, `activityLevel`, `goal`, optional `proteinMultiplier` / `fatMultiplier`). Response shape is the same `TDEEResponse`; **`profileId`** is null. Use this so the frontend does not duplicate Java TDEE logic.

There is no OpenAPI artifact in this repo; this section is the contract for those endpoints.
