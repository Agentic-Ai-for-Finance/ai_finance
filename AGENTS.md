# Project Context

This repo has five active ETL subsystems and one active frontend demo:

- UF ingestion
- unified bank credit-card operations ingestion, including card-count totals
- unified bank debit-card and ATM-only-card operations ingestion, including combined card-count totals
- unified checking-accounts ingestion
- unified prepaid-card operations ingestion, split by natural person and business
- `front/` Next.js demo shell

# Startup Context (Read First)

- At the start of each session, read `plans/features_rollout.txt` first.
- Treat `plans/features_rollout.txt` as the active source of truth for:
  - current feature phase
  - rollout ordering
  - cross-feature dependencies
  - high-level done criteria
- If there is any conflict between ad-hoc notes and rollout sequencing, follow `plans/features_rollout.txt` unless explicitly overridden in-session.

# Runtime

- Python is managed with `uv`.
- Root `.env` is required.
- Tests use `pytest`.
- When adding Python dependencies, update both `pyproject.toml` and `requirements.txt`.

# Active Entrypoints

- UF worker: `uv run data/historical_api_uf.py`
- Credit-card worker: `uv run data/bank_credit_card_ops.py`
- Debit-card worker: `uv run data/bank_debit_card_ops.py`
- Checking-accounts worker: `uv run data/checking_accounts.py`
- Prepaid-card worker: `uv run data/prepaid_card_ops.py`

Primary worker modules:

- `data/workers/uf_worker.py`
- `data/workers/bank_credit_card_ops_worker.py`
- `data/workers/bank_debit_card_ops_worker.py`
- `data/workers/checking_accounts_worker.py`
- `data/workers/prepaid_card_ops_worker.py`

# External Services

- Supabase is the active backend/database.
- UF env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CMF_API_KEY`, `BASE_ENDPOINT_CMF_UF`
- Card env (credit and debit): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `BASE_ENDPOINT_CMF_CARDS`
- Prepaid env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `BASE_ENDPOINT_CMF_CARDS`
- Checking-accounts env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `BASE_ENDPOINT_CMF_CARDS`

# UF Rules

- UF is isolated from CMF dataset sync state and CMF card tables.
- UF modules:
  - `data/sources/uf_source.py`
  - `data/loaders/uf_loader.py`
  - `data/models/uf.py`
- UF runs on a 5-day loop.
- Sync is source-driven:
  - fetch historical UF from CMF
  - request two months ahead so the latest published UF date is visible
  - compare source latest date vs `public.uf_values.uf_date`
  - no-op if unchanged
  - upsert only rows newer than the latest stored date
- Accepted UF date formats: `DD-MM-YYYY`, `YYYY-MM-DD`, `DD/MM/YYYY`
- UF values may be Chilean-formatted numeric strings or numeric values.

# Card Pipeline Rules

- The active card subsystem is one unified worker covering:
  - monthly operation metrics
  - monthly card-base counts
  - operations-rate totals
- Canonical operation types:
  - `Compras`
  - `Avance en Efectivo`
  - `Cargos por Servicio`
- Card-count canonical operation type: `Total Activation Rate`
- All 6 current operation endpoints use:
  - `FechaInicio=20090401`
  - `FechaFin` = run date
  - `from=reload`
- Card-base endpoints use the same CMF builder and worker cycle.
- `institution_code` is derived from `source_codigo` by splitting on `_`, locating `AGIFI`, and taking the next token.
- For non-banking card tags that use `AGIFI_MRC`, do not use plain `MRC` as the institution key; derive a per-series key from the trailing `source_codigo` tokens (for example `TENPO_MCRD`) to avoid issuer collisions.

# Debit Pipeline Rules

- The debit subsystem is one unified worker covering:
  - monthly debit transaction metrics
  - monthly ATM withdrawal metrics
  - monthly combined debit + ATM-only card-base totals
- Canonical operation types:
  - `Debit Transactions`
  - `ATM Withdrawals`
- Operation-metrics canonical operation type: `Total Activation Rate`
- Debit operation endpoints use:
  - `FechaInicio=20090401`
  - `FechaFin` = run date
  - `from=reload`
- Combined card-base logic must sum debit-card and ATM-only datasets:
  - primary active cards
  - supplementary active cards
  - total active cards
  - cards with operations
- Canonical ratios:
  - `operations_rate = total_cards_with_operations / total_active_cards`
  - `supplementary_rate = active_cards_supplementary / active_cards_primary`
- Failed runs must not advance sync state.
- Debit ops sync state stays separate from UF and credit sync state rows.

# Prepaid Pipeline Rules

- The prepaid subsystem is one unified worker covering two worlds:
  - `Natural Person`
  - `Business`
- Canonical operation types:
  - `Purchases`
  - `Utilities`
  - `ATM Withdrawals`
- Operation-metrics canonical operation type: `Total Activation Rate`
- Prepaid operation endpoints use:
  - `FechaInicio=20090401`
  - `FechaFin` = run date
  - `from=reload`
- Each world uses two operation-metrics count endpoints:
  - total active cards
  - cards with operations
- Canonical ratio:
  - `operations_rate = total_cards_with_operations / total_active_cards`
- Failed runs must not advance sync state.
- Prepaid sync state stays separate from UF, credit, debit, and checking rows.

# Checking-Accounts Pipeline Rules

- The checking-accounts subsystem is one unified worker covering four account categories:
  - `Natural Person Without Interest`
  - `Natural Person With Interest`
  - `Business Without Interest`
  - `Business With Interest`
- For each category, the worker pairs two endpoint measures:
  - `account_count`
  - `nominal_balance`
- Endpoint sync is endpoint-grained:
  - one `cmf_dataset_sync_state` row for `account_count`
  - one `cmf_dataset_sync_state` row for `nominal_balance`
  - no-op only when both latest source months are unchanged and historical coverage is complete
- Failed runs must not advance sync state.
- Stored nominal balance is in millions of CLP.
- UF enrichment rules:
  - UF lookup uses the 15th day of the same month
  - `real_balance_uf = nominal_balance_millions_clp / uf_value_used`
  - `average_balance_uf = real_balance_uf / account_count * 1000000`

# Card Worker Flow

- Read active endpoint rows from `public.cmf_datasets`.
- Metadata is endpoint-grained:
  - one `transaction_count` row per operation type
  - one `nominal_volume` row per operation type
  - 6 rows total for the 3 active operations
- Also read the 4 card-count endpoint rows used to derive active cards and cards with operations.
- Also read the 2 non-banking card-count endpoint rows used to extend active cards and cards with operations totals.
- Group datasets by `operation_type`.
- For each operation type:
  - fetch both endpoint tags
  - detect the latest source month for each endpoint
  - compare each endpoint to its own `public.cmf_dataset_sync_state` row
  - no-op only if both source months are unchanged
  - write unified raw rows and unified curated rows
  - enrich curated ops rows with `total_active_cards` from `public.bank_credit_card_counts_curated`
  - record success/failure on both endpoint sync-state rows
- For `Total Activation Rate`, write the bank-month totals used by the public operations-rate view.
- Failed runs must not advance sync state.
- Ops sync state stays separate from UF sync state.
- Be careful to paginate Supabase/PostgREST reads; default page limits can silently truncate lookups.

# Active ETL Modules

- Sources:
  - `data/sources/bank_credit_card_operations.py`
  - `data/sources/bank_debit_card_operations.py`
  - `data/sources/checking_accounts.py`
  - `data/sources/prepaid_card_operations.py`
- Transforms:
  - `data/transforms/bank_credit_card_ops.py`
  - `data/transforms/bank_debit_card_ops.py`
  - `data/transforms/checking_accounts.py`
  - `data/transforms/prepaid_card_ops.py`
- Loaders:
  - `data/loaders/bank_credit_card_ops_loader.py`
  - `data/loaders/bank_debit_card_ops_loader.py`
  - `data/loaders/bank_credit_card_ops_sync_state_loader.py`
  - `data/loaders/checking_accounts_loader.py`
  - `data/loaders/prepaid_card_ops_loader.py`
- Models:
  - `data/models/bank_credit_card_operations.py`
  - `data/models/bank_debit_card_operations.py`
  - `data/models/checking_accounts.py`
  - `data/models/prepaid_card_operations.py`
  - `data/models/uf.py`

# Active Supabase Schema

- UF:
  - `public.uf_values`
  - `public.uf_sync_runs`
- Shared orchestration:
  - `public.cmf_datasets`
  - `public.cmf_dataset_sync_state`
- Card ops:
  - `public.bank_credit_card_ops_raw`
  - `public.bank_credit_card_ops_curated`
  - `public.bank_credit_card_ops_metrics` view
- Debit ops:
  - `public.bank_debit_card_ops_raw`
  - `public.bank_debit_card_ops_curated`
  - `public.bank_debit_card_ops_metrics` view
- Prepaid ops:
  - `public.prepaid_card_ops_raw`
  - `public.prepaid_card_ops_curated`
  - `public.prepaid_card_ops_metrics` view
- Card counts / operations rate:
  - `public.bank_credit_card_counts_raw`
  - `public.bank_credit_card_counts_curated`
  - `public.bank_credit_card_operations_rate_metrics` view
- Debit counts / operation metrics:
  - `public.bank_debit_card_counts_raw`
  - `public.bank_debit_card_counts_curated`
  - `public.bank_debit_card_operation_metrics` view
- Prepaid counts / operation metrics:
  - `public.prepaid_card_counts_raw`
  - `public.prepaid_card_counts_curated`
  - `public.prepaid_card_operation_metrics` view
- Checking accounts:
  - `public.checking_accounts_raw`
  - `public.checking_accounts_curated`
  - `public.checking_accounts_metrics` view

# Data Contracts

- Raw ops rows: `operation_type`, `dataset_code`, `institution_code`, `institution_name`, `period_month`, `transaction_count`, `nominal_volume_millions_clp`
- Curated ops rows add: `uf_date_used`, `uf_value_used`, `real_value_uf`, `average_ticket_uf`, `total_active_cards`, `operations_per_active_card`, `source_dataset_code`, `updated_at`
- Card-count rows: `dataset_code`, `institution_code`, `institution_name`, `period_month`, `card_count`
- Curated card-count rows include:
  - `active_cards_primary`
  - `active_cards_supplementary`
  - `total_active_cards`
  - `cards_with_operations_primary`
  - `cards_with_operations_supplementary`
  - `total_cards_with_operations`
  - `operations_rate`
- All stored timestamps should use Santiago de Chile time.

Volume/UF rules:

- Raw and curated nominal volume are both stored in millions of CLP.
- UF lookup uses the 15th day of the same month.
- `real_value_uf = nominal_volume_millions_clp / uf_value_used`
- `average_ticket_uf = real_value_uf / transaction_count * 1000000`

# Public Read Surface

- `public.bank_credit_card_ops_metrics` is a view, not a persisted metrics table.
- It exposes canonical curated fields including `nominal_volume_millions_clp`, `total_active_cards`, and `operations_per_active_card`.
- It does not expose `average_ticket_clp_today` or `operations_rate`.
- CLP convenience calculations should happen at query time, outside stored schema.
- `public.bank_credit_card_operations_rate_metrics` exposes the bank-month totals for the activation-metrics route, including primary/supplementary card-count fields used in the browser.

# SQL Assets

Active migration set:

- `db/001_cmf_foundation.sql`
- `db/002_uf_source_driven_sync.sql`
- `db/003_bank_credit_card_ops_views.sql`
- `db/004_drop_obsolete_credit_card_views.sql`
- `db/005_drop_obsolete_credit_card_tables.sql`
- `db/006_split_cmf_card_endpoint_metadata.sql`
- `db/007_fix_card_ops_start_dates.sql`
- `db/008_credit_card_card_counts.sql`
- `db/009_credit_card_metrics_rollback.sql`
- `db/010_operations_rate_add_supplementary_fields.sql`
- `db/011_rename_operations_rate_to_total_activation_rate.sql`
- `db/012_operations_rate_view_add_cards_with_operations_fields.sql`
- `db/013_non_banking_credit_card_endpoints.sql`
- `db/014_debit_card_metrics.sql`
- `db/015_checking_account_metrics.sql`
- `db/017_prepaid_card_metrics.sql`

# Repo Structure

- Active runtime code lives in `data/`, `db/`, `front/`, `shared/`, and `tests/`.
- Deprecated split-CMF code is kept under `archive/` directories and is not part of the active runtime path.

# Testing And Deployment

- Active card tests use unified ops naming.
- Source tests include a unified live-payload regression fixture for the current card ops payload shape.
- Old split-CMF tests/fixtures are removed from active `tests/`.
- Railway should run workers as worker services, not web apps.
- Credit-card worker deploy command: `uv run data/bank_credit_card_ops.py`
- Debit-card worker deploy command: `uv run data/bank_debit_card_ops.py`
- Checking-accounts worker deploy command: `uv run data/checking_accounts.py`
- Railway worker env var workaround (mise/aqua uv attestation check): set `MISE_AQUA_GITHUB_ATTESTATIONS=false`.

# Frontend Direction

- `front/` is an active Next.js + Tailwind demo shell.
- Install with `npm install` in `front/`.
- Run with `npm run dev` in `front/`.
- Validate with `npm run build` in `front/`.
- Auth Phase 1 is now approved.
- Clerk is the active Phase 1 auth provider.
- Supabase Auth remains the fallback if Clerk is not viable by the documented checkpoint.
- Continue the Layer 2 security pass (Auth Surfaces + RLS):
  - enumerate every API route/endpoint and confirm each is gated by auth + authorization with middleware matcher coverage where required
  - ensure Supabase RLS is enabled for user-owned app data and policies bind identity at the database layer
  - verify no route is only "hidden" in the frontend while still publicly callable

# Frontend Product Rules

- Top bar uses the Taclaro logo.
- Primary sections are `Credit Cards`, `Debit Cards`, `Prepaid Cards`, `Checking Accounts`, `Loans`.
- `Credit Cards`, `Debit Cards`, `Prepaid Cards`, and `Checking Accounts` are functional in v1; `Loans` remains a placeholder.
- Debit-card work should reuse the credit-card frontend pattern and interaction model rather than redesigning the shell.

Credit-card routes:

- `/credit-cards/purchases`
- `/credit-cards/cash-advances`
- `/credit-cards/fees`
- `/credit-cards/total-activation-rate`
- `/credit-cards/operations-rate` redirects to `/credit-cards/total-activation-rate` preserving `view`

Debit-card routes:

- `/debit-cards/transactions`
- `/debit-cards/atm-withdrawals`
- `/debit-cards/total-activation-rate`

Prepaid-card routes:

- `/prepaid-cards`
- `/prepaid-cards/natural-person/purchases`
- `/prepaid-cards/natural-person/utilities`
- `/prepaid-cards/natural-person/atm-withdrawals`
- `/prepaid-cards/natural-person/total-activation-rate`
- `/prepaid-cards/business/purchases`
- `/prepaid-cards/business/utilities`
- `/prepaid-cards/business/atm-withdrawals`
- `/prepaid-cards/business/total-activation-rate`

Checking-accounts routes:

- `/checking-accounts`
- `/checking-accounts/personas-naturales-sin-intereses`
- `/checking-accounts/personas-naturales-con-intereses`
- `/checking-accounts/personas-juridicas-sin-intereses`
- `/checking-accounts/personas-juridicas-con-intereses`

Current shell/UI constraints:

- Top navbar is centered, text-first, with underline active state and a visual-only `Login` CTA.
- On desktop main nav (`lg` and above), category labels expose hover dropdown menus with the same subcategory links shown in the left sidebar.
- Left sidebar is minimalist text nav; Credit Cards shows the operation subroutes.
- Bank selection lives under the chart in `Banks shown` with `All`, `None`, and `Reset`.
- Bottom summary table keeps the `Others` row for share-applicable metrics and uses month-explicit comparison headers.
- Chart controls and rendering should stay aligned with the restored `origin/main` implementation.
- Sidebar uses a `Credit Cards` macro title and no `Live` badges.
- Dashboard copy should describe the product, not repeat the shareable route.
- Category landing pages (`/credit-cards`, `/debit-cards`, `/prepaid-cards`, `/checking-accounts`) use full background copy (no rounded panel container), larger typography, and the curated text from `descriptions/landing-page-category.txt`.
- Layout should use full width without requiring horizontal chart scroll.
- Mobile baseline is required:
  - no text overlap/clipping at small widths
  - no forced page-level horizontal overflow on phone screens
  - controls remain tappable and readable down to ~320px width
- On screens below `lg`, Credit Cards navigation/inputs use a collapsible drawer opened from the top bar `Menu` button.
- On `lg` and above, keep the current sticky left sidebar behavior.
- Mobile top nav uses a horizontally scrollable section row (`Credit Cards`, `Debit Cards`, `Checking Accounts`, `Loans`) while desktop keeps centered nav.
- Loans page remains a placeholder and currently renders a minimal italic `Soon` welcome message.
- Chart tooltips should stay inside viewport bounds on small screens.
- Summary table may use local horizontal overflow as a safety fallback, but should use compact spacing on small screens before overflow is needed.

Credit-card behavior:

- Analysis tab is shareable via the `view` query param.
- Operation pages expose `Volume`, `Transactions`, `Avg. Transaction`, and `Operations per Active Card`.
- Operation Metrics page exposes `Total Active Cards`, `Total Cards with Operations`, `Total Activation Rate`, `Primary Activation Rate`, `Supplementary Activation Rate`, and `Supplementary Rate`.
- Main visualization is a multi-bank line chart over time.
- If the selected range is a single month, switch to a horizontal bar chart sorted descending.
- Bar labels stay outside bars with enough right-side space to avoid clipping.
- Default range is latest available month as `End` and the same calendar month in the previous year as `Start` (for example, `2026-02` to `2025-02`), clamped by the operation's earliest available month.
- Time range is month-based and displayed as `MM/YY`.
- Users can select/deselect banks.
- Bank labels come from `others/bank-mapping.txt`.
- Bank colors are deterministic from bank code.
- Point markers shrink for long date ranges.
- Tooltips support hover/focus inspection.
- Tooltip share line should show `XX% of the system` using system-wide month totals, not selected-bank totals; omit that line for `Transactions`.
- For non-banking issuers, frontend includes:
  - `Tenpo Payments S.A. - Tarjeta Mastercard`, displayed as `Tenpo`
  - the Promotora CMR Falabella issuer-brand rows, merged with `CMR Falabella S.A (SAG)` and displayed as `CMR Falabella`
- Other non-banking issuer-brand rows are filtered out in UI.

Debit-card behavior:

- Section title is `Debit Cards`, and description explicitly states it includes debit cards and ATM-only cards.
- Analysis tab is shareable via the `view` query param.
- Operation pages expose `Volume`, `Transactions`, `Avg. Transaction`, and `Operations per Active Card`.
- Operation Metrics page exposes:
  - `Total Active Cards`
  - `Total Cards with Operations`
  - `Total Activation Rate`
  - `Supplementary Rate`
- Debit operation metrics do not expose:
  - `Primary Activation Rate`
  - `Supplementary Activation Rate`
- Operational denominator for `Operations per Active Card` uses the combined debit + ATM-only active-card base.

Prepaid-card behavior:

- Section title is `Prepaid Cards`.
- Left sidebar groups routes with `Natural Person` first, then `Business`.
- Analysis tab is shareable via the `view` query param.
- Operation pages expose `Volume`, `Transactions`, `Avg. Transaction`, and `Operations per Active Card`.
- Operation Metrics page exposes:
  - `Total Active Cards`
  - `Total Cards with Operations`
  - `Total Activation Rate`
- Prepaid v1 uses only the provided non-banking issuer endpoints.
- Aggregate `TX_*` prepaid totals are not exposed as their own frontend pages in v1.

Checking-accounts behavior:

- Section title is `Checking Accounts`.
- Analysis tab is shareable via the `view` query param.
- Category pages expose:
  - `Volume`
  - `Number of Accounts`
  - `Average Balance`
- `/checking-accounts` is an overview route (not an aggregated metrics dashboard).
- Share-applicable table behavior applies to `Volume` and `Number of Accounts`.
- `Average Balance` is not treated as a market-share metric.

Formatting and metric rules:

- `Volume ($)` uses UF-adjusted CLP volume.
- UF control label is `UF value`, uses a fixed `$` prefix, and formats thousands with `.`
- Default UF is the latest UF up to today in `America/Santiago`.
- User UF overrides must not reset bank selection.
- Money values use a fixed `$` prefix and integer formatting with `.` thousands separators.
- Percentages use `,` as decimal separator with 1 decimal place.
- Omit last-visible/last-loaded month copy because Start/End already show the range.
- Share-based tables include an `Others` row.
- In share-applicable operation views (`Volume`, `Transactions`), table columns are:
  - `Bank`
  - `<Metric>`
  - `Growth <Metric> <End> vs <Start>` (percentage growth)
  - `Market Share <End>`
  - `Market Share <End> vs <Start>` (absolute pp delta with direction arrow)
- If a bank has no start-month market-share row but has an end-month row, treat start-month market share as `0` for market-share pp delta.
- If a bank has no start-month metric row, do not compute `<Metric>` growth for that bank (show no value for growth).
- Date/input query updates in the sidebar must preserve scroll position (no jump to top while editing filters).
- Bank selector pills show only the bank name.
- `CAR S.A.` and `Banco Ripley` must be merged and displayed as `Banco Ripley`.

Frontend data access:

- Public dashboard reads should now default to backend API proxy routes, not browser-direct Supabase reads.
- Public browser-visible data is limited to approved nominal/base metrics only.
- Protected derived metrics must route through authenticated backend APIs.
- A direct browser-to-Supabase path may exist only as a manual emergency fallback for explicitly public endpoints.
- Frontend must still auto-paginate larger date ranges through the API layer and must not treat missing rows as zero values.

# Session Handoff (Debit Rollout)

- Debit rollout execution log is tracked in `final_plan_debit_cards.txt`.
- Completed phases:
  - Phase 0 (execution scaffold)
  - Phase 1 (database migration + SQL tests)
  - Phase 2 (backend domain/transforms/loaders + tests)
  - Phase 3 (sources/worker/entrypoint + tests)
  - Phase 4 (frontend config/query wiring + contract tests)
  - Phase 5 (frontend UI replication for debit routes)
  - Phase 6 (final verification and deployment prep)
- Current debit frontend status:
  - debit dashboard routes are fully wired (no placeholders)
  - market-share and growth table behavior follows current rules above

# Session Handoff (Prepaid Rollout)

- Rollout status:
  - Phase 0 plan scaffold: complete (`35e35e4`)
  - Phase 1 SQL migration/contracts: complete (`de3fa55`)
  - Phase 2 backend models/transforms/loaders: complete (`57389f4`)
  - Phase 3 source/worker/entrypoint: complete (`57389f4`)
  - Phase 4 frontend config/query layer: complete (`e996d0d`)
  - Phase 5 frontend routes/sidebar/dashboard: complete (`e996d0d`)
  - Post-deploy worker fixes:
    - empty source-month handling fix (`87a3556`)
    - CMF `observaciones` payload shape support (`f54ed6e`)
- Database migration status:
  - `db/017_prepaid_card_metrics.sql` applied to Supabase project `vqvlzfctbvqpouctestu` via MCP migration `017_prepaid_card_metrics`.
- Railway deployment:
  - prepaid worker command: `uv run data/prepaid_card_ops.py`
  - worker env var workaround remains required: `MISE_AQUA_GITHUB_ATTESTATIONS=false`
  - watch paths:
    - `data/prepaid_card_ops.py`
    - `data/workers/prepaid_card_ops_worker.py`
    - `data/sources/prepaid_card_operations.py`
    - `data/transforms/prepaid_card_ops.py`
    - `data/loaders/prepaid_card_ops_loader.py`
    - `data/models/prepaid_card_operations.py`
    - `data/loaders/bank_credit_card_ops_sync_state_loader.py`
    - `db/017_prepaid_card_metrics.sql`
- Initial post-migration verification:
  - `public.cmf_datasets`: 16 prepaid dataset rows, all with `start_date = 2009-04-01`.
  - `public.prepaid_card_ops_metrics` and `public.prepaid_card_operation_metrics` views exist.

# Session Handoff (Checking Accounts Rollout)

- Baseline branch/commit for verification: `accounts_feature` at `0ff212c`.
- Rollout phase status:
  - Phase 1 SQL migration/contracts: complete (`f311375`)
  - Phase 2 backend models/transforms/loaders: complete (`cbb96c2`)
  - Phase 3 source/worker/entrypoint + tests: complete (`cb25df9`)
  - Phase 4 frontend routes/config/queries + contracts: complete (`9981fd8`)
  - Phase 5 checking dashboard UI: complete (`0ff212c`)
- Database migration status:
  - `db/015_checking_account_metrics.sql` applied to Supabase project `vqvlzfctbvqpouctestu` via MCP migration `015_checking_account_metrics`.
- Railway deployment status:
  - checking worker deployed with command `uv run data/checking_accounts.py`.
  - worker env var workaround remains required: `MISE_AQUA_GITHUB_ATTESTATIONS=false`.
  - watch paths:
    - `data/checking_accounts.py`
    - `data/workers/checking_accounts_worker.py`
    - `data/sources/checking_accounts.py`
    - `data/transforms/checking_accounts.py`
    - `data/loaders/checking_accounts_loader.py`
    - `data/models/checking_accounts.py`
    - `data/loaders/bank_credit_card_ops_sync_state_loader.py`
    - `db/015_checking_account_metrics.sql`
- Post-deploy verification snapshot (2026-05-06):
  - `public.checking_accounts_raw`: 531 rows, latest month `2026-02-01`.
  - `public.checking_accounts_curated`: 531 rows, latest month `2026-02-01`.
  - `public.cmf_dataset_sync_state`: 8 checking dataset rows with non-null `last_successful_sync_at` and null `last_error`.
  - spot checks confirm:
    - `real_balance_uf = nominal_balance_millions_clp / uf_value_used`
    - `average_balance_uf = real_balance_uf / account_count * 1000000`
- Post-deploy fixes applied (2026-05-06):
  - FechaInicio correction: checking endpoint metadata start dates normalized to `2009-04-01` (CMF query `FechaInicio=20090401`).
  - corrective SQL migration added: `db/016_fix_checking_accounts_start_dates.sql`.
  - repopulation runbook confirmed:
    - clear checking sync rows in `public.cmf_dataset_sync_state` (`dataset_code like 'checking_accounts_%'`)
    - truncate `public.checking_accounts_raw` and `public.checking_accounts_curated`
    - restart checking worker
  - runtime bug fix: avoid `decimal.DivisionUndefined` when `account_count = 0` by storing `average_balance_uf = 0` for those rows.
  - performance fix: cache UF lookup values per month during checking transform to avoid repeated `public.uf_values` reads for the same `uf_date`.

# Session Handoff (Frontend Nav/Landing Refresh)

- Date: 2026-05-07.
- Desktop top navbar behavior:
  - hover dropdown added per category (`Credit Cards`, `Debit Cards`, `Prepaid Cards`, `Checking Accounts`) with subcategory routes aligned to left-sidebar navigation.
- Category landing pages:
  - routes: `/credit-cards`, `/debit-cards`, `/prepaid-cards`, `/checking-accounts`
  - include overview text, subcategories, data availability, and key information
  - canonical copy source: `descriptions/landing-page-category.txt`
  - styling updated to remove rounded panel container and increase font sizing/spacing.
- Loans UX:
  - route `/loans` shows a minimal italic `Soon` message
  - legacy sidebar copy (`Only the Credit Cards section is connected in v1...`) removed.
- Category URL behavior fix (2026-05-07):
  - top category links now resolve to clean landing URLs without carrying dashboard query params:
    - `/credit-cards`
    - `/debit-cards`
    - `/prepaid-cards`
    - `/checking-accounts`
  - fixed Prepaid landing-page navigation so repeated clicks do not re-inject `view/start/end/uf` into `/prepaid-cards`.
  - dashboard operation routes still preserve query params for shareable analysis state.

# Session Handoff (Features Rollout)

- Date: 2026-05-08.
- Canonical rollout plan file: `plans/features_rollout.txt`.
- Ordered phases:
  - Phase 0: Product and security decisions
  - Phase 1: Backend security foundation
  - Phase 2: Home page
  - Phase 3: Prompt bar (website analysis assistant)
  - Phase 4: Compare cards page
  - Phase 5: WhatsApp analysis agent
  - Phase 6: Hardening and launch readiness
- Current standing:
  - Plan created and accepted.
  - Execution should start from Phase 0 and Phase 1 before shipping new data-heavy UX.

# Session Handoff (Phase 0 Lock + Phase 1 Foundation)

- Date: 2026-05-08.
- Planning lock committed:
  - `43e736a` `docs: lock phase 0 security decisions and phase 1 kickoff`
- Implementation foundation committed:
  - `87c3374` `feat: add phase 1 auth and metrics access foundation`
- Phase 0 status:
  - locked and approved in `plans/phases/phase0/phase0_decisions.md`
  - backlog synced in `plans/phases/phase0/phase0_backlog.md`
- Locked Phase 1 policy:
  - roles are only `user` and `admin`
  - Clerk is active provider; Supabase Auth is fallback
  - public data is nominal/base only
  - UF-adjusted and other derived analytics are protected
  - metric pills remain visible while protected logged-out data stays locked
  - public dashboard path should default to backend API proxy routes
  - protected analysis is read-only and bounded
- Implemented in `front/`:
  - Clerk auth foundation with compatibility wrapper for missing local Clerk env
  - route middleware for protected API groups
  - API routes for:
    - `/api/v1/public/metrics`
    - `/api/v1/protected/metrics`
    - `/api/v1/auth/session`
    - `/api/v1/preferences/banks`
    - `/api/v1/analysis/query`
    - `/api/v1/compare/query`
    - `/api/v1/admin/audit`
  - dashboard query modules migrated from browser-direct Supabase access to backend API access
  - locked-state UI for protected derived metrics across credit, debit, prepaid, and checking dashboards
  - signed-in default bank preference hook
- Database foundation added:
  - `db/018_phase1_security_foundation.sql`
  - adds `public.app_user_profiles`
  - adds `public.app_audit_logs`
  - enables RLS on user-owned app data foundation
- Verification completed on repo state at handoff:
  - `npm run build` in `front/` passed
  - targeted contract tests passed:
    - `tests/front/test_debit_frontend_contracts.py`
    - `tests/front/test_prepaid_frontend_contracts.py`
    - `tests/front/test_checking_accounts_frontend_contracts.py`
    - `tests/front/test_phase1_security_frontend_contracts.py`
    - `tests/db/test_phase1_security_sql.py`
- Follow-up status update (2026-05-10, development environment):
  - `db/019_phase1_grant_hardening.sql` applied to Supabase project `hnuvihnvabfryedfchdb` via MCP migration `019_phase1_grant_hardening`.
  - `db/020_phase1_profile_audit_least_privilege.sql` applied to Supabase project `hnuvihnvabfryedfchdb` via MCP migration `020_phase1_profile_audit_least_privilege`.
  - auth env verification in local `.env`:
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: set
    - `CLERK_SECRET_KEY`: set
    - `ADMIN_EMAIL_ALLOWLIST`: set
  - targeted security verification passed after the above updates:
    - `uv run pytest -q tests/front/test_phase1_security_frontend_contracts.py tests/db/test_phase1_security_sql.py`
    - `npm run build` in `front/`
- Avoid unrelated local files unless explicitly requested:
  - `AGENTS.md`
  - `.DS_Store`
  - `front/prototypes/`
  - repo-root `package.json`
  - repo-root `package-lock.json`
