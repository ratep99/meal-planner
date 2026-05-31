# Meal Planner

Household meal planning: React UI, Spring Boot API, and PostgreSQL.

## Quick start (local dev)

```bash
git clone https://github.com/ratep99/meal-planner.git
cd meal-planner
docker compose up
```

Open **http://localhost:5173**. The API is also on **http://localhost:8080** if you need it directly.

Postgres data, Maven cache, uploaded recipe images, and `node_modules` live in named Docker volumes, so `docker compose down` (without `-v`) does not wipe the database.

If you previously used Compose from a folder named `Internal`, reuse the old volumes with:

```bash
docker compose -p internal up
```

## When to rebuild or restart

| You changed | What to do |
| ----------- | ---------- |
| Java or TS/React source | Save files; restart the backend container if you need a clean JVM reload (Spring Boot does not hot-reload by default). Frontend reloads via Vite. |
| `pom.xml` or new Java deps | `docker compose build backend && docker compose up` |
| `package.json` / `package-lock.json` | Remove the `frontend_node_modules` volume or run `docker compose run --rm --entrypoint "" frontend npm ci`, then `docker compose up` |
| Flyway SQL (`backend/src/main/resources/db/migration`) | Restart the `backend` service |
| `docker-compose.yaml` or Dockerfiles | `docker compose up --build` |

## Repository layout

| Path | Description |
| ---- | ----------- |
| [backend/](backend/) | Spring Boot API — see [backend/README.md](backend/README.md) |
| [frontend/](frontend/) | Vite + React UI |
| [legacy/python-mealplan/](legacy/python-mealplan/) | Older Python/YAML meal plan prototype (not part of the Docker stack) |

Specification: [backend/meal-planner-spec.md](backend/meal-planner-spec.md)
