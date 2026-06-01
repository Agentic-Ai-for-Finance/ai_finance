# ai_finance

This repository contains:

- Python ETL workers for Chilean financial datasets
- SQL migrations for the active Supabase schema
- a `front/` Next.js demo application

The active ETL subsystems are:

- UF ingestion
- bank credit-card operations and card counts
- bank debit-card and ATM-only-card operations and counts
- checking accounts
- prepaid card operations

## Reproducing The Project

### 1. Prerequisites

- Python `3.13` (see `.python-version`)
- `uv` for Python environment and dependency management
- Node.js `20+` and `npm`
- a Supabase project with the required schema/migrations applied

Install `uv` if needed:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Clone And Enter The Repo

```bash
git clone <your-repo-url>
cd ai_finance
```

### 3. Python Setup

Install Python dependencies:

```bash
uv sync
```

If you prefer `pip`, the repo also includes `requirements.txt`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Frontend Setup

Install frontend dependencies:

```bash
cd front
npm install
cd ..
```

### 5. Environment Variables

The Python workers and the Next.js app both load env vars from the repo root.

Branch-based loading behavior:

- `main` and `hotfix-*` branches prefer `.env.production`
- other branches prefer `.env.development`
- if that file is missing, the app falls back to `.env`

For a local setup, creating a root `.env` is the simplest option.

Minimum shared variables for data access:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Additional variables by feature:

```env
# UF worker
CMF_API_KEY=...
BASE_ENDPOINT_CMF_UF=...

# Card, debit, prepaid, checking workers
BASE_ENDPOINT_CMF_CARDS=...

# Optional Clerk auth for protected frontend routes
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
ADMIN_EMAIL_ALLOWLIST=user@example.com,admin@example.com

# Optional search/analysis features in the frontend
EXA_API_KEY=...
SEARCH_MODEL=gpt-4o
SEARCH_MAX_RESULTS=10
```

Notes:

- Clerk is optional for basic local UI work; the app has a compatibility wrapper for environments without Clerk keys.
- Protected API routes require auth when Clerk is enabled.
- Worker retry behavior can be tuned with optional vars such as `WORKER_RUN_MODE`, `WORKER_MAX_ATTEMPTS`, and `WORKER_RETRY_DELAY_SECONDS`.

## Running The Project

### Frontend

Start the Next.js app:

```bash
cd front
npm run dev
```

Build the frontend:

```bash
cd front
npm run build
```

### ETL Workers

Run each worker from the repo root.

UF:

```bash
uv run data/historical_api_uf.py
```

Credit cards:

```bash
uv run data/bank_credit_card_ops.py
```

Debit cards:

```bash
uv run data/bank_debit_card_ops.py
```

Checking accounts:

```bash
uv run data/checking_accounts.py
```

Prepaid cards:

```bash
uv run data/prepaid_card_ops.py
```

## Database

SQL migrations live in `db/`.

This project expects the Supabase schema to include the active tables and views used by:

- `public.uf_values`
- `public.cmf_datasets`
- `public.cmf_dataset_sync_state`
- the `*_raw`, `*_curated`, and metrics/view tables for credit, debit, prepaid, and checking

If you are reproducing the project from scratch, apply the SQL files in `db/` in order before running the workers or frontend routes that depend on those tables.

## Tests And Verification

Run the Python test suite:

```bash
uv run pytest
```

Run a targeted frontend/security contract pass:

```bash
uv run pytest -q tests/front/test_phase1_security_frontend_contracts.py tests/db/test_phase1_security_sql.py
```

Run frontend lint:

```bash
cd front
npm run lint
```

Run frontend production build:

```bash
cd front
npm run build
```

## Package Notes

- Python dependencies are declared in `pyproject.toml`.
- A flat mirror is kept in `requirements.txt` for environments that install via `pip`.
- Frontend dependencies are declared in `front/package.json`.
- The lockfile for the frontend is `front/package-lock.json`.

## Repo Layout

- `data/`: ETL entrypoints, workers, sources, transforms, loaders, models
- `db/`: SQL migrations
- `front/`: Next.js frontend
- `tests/`: Python and frontend contract tests
- `shared/`: shared runtime helpers
