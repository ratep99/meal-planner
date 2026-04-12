# Meal Planner — Backend

Spring Boot API for household meal planning: profiles (TDEE), ingredients (incl. Open Food Facts), recipes, meal plans, shopping lists, PDF export.

**Specification:** [meal-planner-spec.md](meal-planner-spec.md) (backend + frontend UI spec).

**Run:** `./mvnw spring-boot:run` (requires PostgreSQL and DB `mealplanner`). Use `application-local.properties` for credentials and overrides (not committed).

### Docker Compose (full stack, local dev)

From the directory that contains **`docker-compose.yaml`** (often a parent folder that holds both repositories as `backend/` and `frontend/`):

```bash
docker compose up
```

**Separate git repositories:** clone backend and frontend anywhere on disk, then either put `docker-compose.yaml` and `.env` in a parent folder and set `MEAL_PLANNER_BACKEND_DIR` / `MEAL_PLANNER_FRONTEND_DIR` in `.env` (see `.env.example` next to the compose file), or keep the default `./backend` and `./frontend` names under one workspace.

Open the UI at `http://localhost:5173`. Postgres data, Maven cache, uploaded recipe images, and `node_modules` are kept in named volumes, so `docker compose down` (without `-v`) does not wipe the database.

- **Java or frontend source only:** save files; restart the backend container if you need a clean JVM reload (Spring Boot dev server does not hot-reload by default).
- **`pom.xml` or new Java dependencies:** `docker compose build backend && docker compose up`.
- **`package.json` / `package-lock.json`:** remove the `frontend_node_modules` volume or run `docker compose run --rm --entrypoint "" frontend npm ci`, then `docker compose up`.
- **Flyway migrations:** restart the `backend` service.

## Profiles: calories and macros after a goal change

`POST /api/profiles` and `PUT /api/profiles/{id}` return `UserProfileResponse` with:

- **`calculatedKcal`** — rounded **daily calorie target after goal** (maintenance TDEE × goal factor: `CUT` 0.85, `MAINTAIN` 1.0, `BULK` 1.125).
- **`targetProtein`**, **`targetFat`** — from `proteinMultiplier` / `fatMultiplier` × body weight (unchanged by goal).
- **`targetCarbs`** — fills the remainder of that goal-adjusted budget (see spec).

Changing **`goal`** therefore changes **`calculatedKcal`** and usually **`targetCarbs`** on the same response.

`GET /api/profiles/{id}/tdee` returns **`TDEEResponse`**: **`tdee`** = maintenance (pre-goal); **`calculatedKcal`** = same post-goal target as above; **`goal`** and **`goalCalorieMultiplier`** describe the applied adjustment; macro fields match the profile.

**Live preview (no saved profile):** `POST /api/profiles/tdee-preview` with JSON body matching `TdeePreviewRequest` (`gender`, `age`, `heightCm`, `weightKg`, `activityLevel`, `goal`, optional `proteinMultiplier` / `fatMultiplier`). Response shape is the same `TDEEResponse`; **`profileId`** is null. Use this so the frontend does not duplicate Java TDEE logic.

There is no OpenAPI artifact in this repo; this section is the contract for those endpoints.
