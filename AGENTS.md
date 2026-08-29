# Meal Planner — agent instructions

Household meal planning for two people. React SPA + Spring Boot API + PostgreSQL, run via Docker Compose.

**Read [CLAUDE.md](CLAUDE.md) first — it holds the real instructions.** This file exists because some
agents look for `AGENTS.md` and others for `CLAUDE.md`; the content lives in one place so the two cannot
drift apart. `backend/CLAUDE.md` and `frontend/CLAUDE.md` cover their own side, and
[docs/spec.md](docs/spec.md) is the specification.

The three things worth knowing before you touch anything:

- **Verify through Docker.** The host has no `node`/`npm` and its JDK is not the one this project builds
  with. Run `./scripts/check-frontend.sh`, `./scripts/check-backend.sh`, or `./scripts/check-all.sh` — do
  not conclude a change compiles without one of them.
- **No authentication anywhere**, by deliberate decision. Not an oversight to fix.
- **The nutrition math is the product.** A silent rounding change produces a wrong printed meal plan and
  nobody notices.
