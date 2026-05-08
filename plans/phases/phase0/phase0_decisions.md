# Phase 0 Architecture and Security Decisions

Date: 2026-05-08
Owner: Product + Engineering
Status: Approved and locked
Readiness verdict: GO for Phase 1
Source of truth: `plans/features_rollout.txt`

## Scope and Intent
This note locks the product and security boundaries required before Phase 1 implementation.

## Locked Assumptions
- The current frontend is a public-read demo shell and needs a secured server access layer before shipping new analysis UX.
- Supabase remains the system of record for ETL outputs and user-owned application data.
- Browser-public market data in Phase 1 is limited to approved nominal/base metrics only.
- Protected analytics features are authenticated experiences even when the surrounding route remains discoverable.
- No signed-in export capability exists in Phase 1.

## Auth and Role Model

### Roles
- Phase 1 uses only two real roles:
  - `user`
  - `admin`
- All authenticated non-admin accounts share the same access in Phase 1.
- `admin` is assigned only by a server-side static email allowlist.
- Future `Basic` / `Pro` / `Beast` tiers are explicitly deferred and must not shape Phase 1 authorization.

### Auth provider
- Clerk is the approved auth provider for Phase 1.
- Supabase Auth is the approved fallback if Clerk is not viable.
- Clerk must be working end-to-end in development by **May 15, 2026**.
- If that checkpoint is missed, implementation switches to Supabase Auth.

## Public vs Protected Data

### Public data
- Public dashboard data is limited to approved base and nominal metrics only:
  - transaction counts
  - account counts
  - nominal volume / nominal balance metrics
  - bank or issuer labels and period metadata required to render those public metrics

### Protected data
- Protected data includes:
  - UF-adjusted values
  - averages
  - activation rates
  - operations per active card
  - compare outputs
  - Prompt Bar outputs
  - WhatsApp outputs
  - admin telemetry
  - ETL metadata
  - sync state
  - raw tables
  - internal curated tables
- UF-deflated values remain protected even when the corresponding nominal metric is public.

## Public Dashboard UX Rules
- Public users still see metric pills/options for protected derived metrics.
- The protected data itself is locked or obscured when logged out.
- Do not blur or hide the metric selector pill itself.
- Locked state must include a login CTA that explains what unlocks after sign-in.

## Public Fetch Architecture
- Approved public dashboard data is served through backend API routes by default.
- Direct browser-to-Supabase reads are no longer the normal path.
- A direct Supabase fallback may exist only as a manual emergency switch for explicitly public endpoints.
- Protected routes never use that fallback.

## Onboarding, Preferences, and RLS
- RLS is required in Phase 1.
- In Phase 1, onboarding bank or institution selection is a user preference, not an authorization boundary.
- The saved selection defines the user’s default bank filter when they open metric views after login.
- Users are not restricted to only those banks in Phase 1.
- Phase 1 RLS therefore applies to user-owned application data such as profile and preference records, not to market metric rows as bank entitlements.

## LLM Scope and Safety Policy
- Prompt Bar and WhatsApp are grounded analytics only.
- Every substantive claim must trace back to approved data outputs.
- Execution is bounded freeform natural language backed by a backend allowlist.
- Allowed operations are read-only SELECT-style retrieval and aggregation only.
- The LLM stack must never perform writes, mutations, admin actions, or other side effects.

### LLM limits
- Max date range: 120 months
- Max entities: 5
- Output contract: summary plus limited evidence only
- No bulk dumps
- No export at launch

### Shared protected-analysis quotas
- `user`: 120 requests/hour
- `admin`: 240 requests/hour

### Public dashboard quota
- 300 requests/hour per IP

## WhatsApp Identity
- WhatsApp uses the same core identity as the website.
- Users must authenticate on the website and register a phone number.
- WhatsApp requests inherit that mapped account’s permissions and limits.

## Mandatory Phase 1 Controls
- protected-route auth and authorization
- server-only service-role usage
- DTO and field allowlists
- rate limiting
- audit logging
- structured error handling
- RLS for user-specific application data
- authorization tests
- data-minimization tests

## Planned Endpoint Classes
| Endpoint | Purpose | Class | Access policy |
|---|---|---|---|
| `GET /api/v1/public/metrics/*` | Public dashboards with minimal nominal/base fields | Public | No auth, strict DTO, IP rate-limited |
| `POST /api/v1/analysis/query` | Prompt Bar analysis orchestration | Protected | Auth required, role checked, allowlisted read-only intents |
| `POST /api/v1/compare/query` | Compare Cards computed output | Protected | Auth required, role checked, bounded filters and date range |
| `POST /api/v1/whatsapp/query` | WhatsApp analysis entrypoint | Protected | Auth, channel validation, account-link required |
| `GET /api/v1/admin/audit` | Audit and security events | Protected | Admin only |
| `GET /api/v1/admin/usage` | Usage and cost telemetry | Protected | Admin only |

## Rejected Alternatives
- `viewer` / `analyst` / `admin` in Phase 1: rejected because non-admin permissions are intentionally flat right now.
- Direct Supabase as the normal public path: rejected because it weakens control and observability.
- Automatic browser fallback to Supabase: rejected because it permanently weakens the proxy boundary.
- Open-ended LLM assistant behavior: rejected because it breaks grounded-data constraints.
- Any write-capable LLM or tool path: rejected because Prompt Bar and WhatsApp are read-only analytics surfaces.
- Bank selection as a Phase 1 authorization boundary: rejected because it is only a default preference in Phase 1.

## Threat Model Lite
| Risk | Required control |
|---|---|
| Unauthorized access to protected routes | Auth middleware plus authorization checks on every protected route |
| Over-broad public payloads | DTO allowlists and data-minimization tests |
| Browser scraping at scale | IP rate limits, pagination caps, minimal payloads, observability |
| Service-role leakage | Service-role keys remain server-only |
| Broken user-data isolation | RLS enabled and verified on user-owned tables |
| Prompt injection / unsafe LLM tool use | Allowlisted intents, read-only operations, bounded query planner |
| Abuse of protected analysis | Per-role quotas, date/entity caps, audit logging |
| Logging sensitive payloads | Redaction and structured logging |
| WhatsApp spoofing or account takeover | Signature validation plus verified account linking |
| Privilege escalation | Centralized role resolution from server-side email allowlist |

## Phase 1 Go/No-Go
Phase 1 is GO because:
- the role model is locked
- the auth-provider decision and fallback rule are locked
- public vs protected data classes are locked
- public dashboard UX rules for locked derived metrics are locked
- the read-only LLM policy is locked
- RLS scope for user-owned app data is locked
- the Phase 1 kickoff backlog is implementation-ready
