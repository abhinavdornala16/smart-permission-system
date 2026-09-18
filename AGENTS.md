# AGENTS.md

Guide for AI coding agents working in this repository.

## Project layout

- `backend/` — Flask API (blueprints in `app/`, models in `app/models/`, tests in `tests/`)
- `frontend/` — React 18 + Vite + Tailwind app (pages under `src/pages/`)
- `docs/` — deployment and architecture notes
- Tests run against a local SQLite DB (`backend/instance/test_db.db`); no external services or secrets required.

## Working directory

The git repository root is this folder. Always run commands from the relevant subdirectory
(`backend/` or `frontend/`) using `workdir`.

## Verification commands

Backend (from `backend/`):

```bash
python -m venv .venv          # first time only
.venv\Scripts\pip install -r requirements.txt   # Windows
pytest                        # run full suite
```

Frontend (from `frontend/`):

```bash
npm install        # first time only
npm run lint       # oxlint
npm run build      # vite build
```

## Conventions

- Backend uses Flask blueprints organized by feature module (`permissions`, `substitutes`, `admin`, etc.).
- Time values: use `utcnow()` from `app/utils/time_utils.py` (naive UTC, drop-in for deprecated `datetime.utcnow()`). Do not introduce new `datetime.utcnow()` calls.
- Seed/demo data is created via `backend/seed.py` (`seed(app)` function). Tests call it in a module fixture.
- Production DB provisioning uses raw SQL in `backend/schema_supabase.sql`; `db.create_all()` is dev-only.

## Notes

- CI workflow: `.github/workflows/ci.yml` — runs backend `pytest` and frontend `lint`/`build`.
- Do not commit `backend/.env`, `frontend/node_modules/`, or `backend/instance/*.db` (see `.gitignore`).