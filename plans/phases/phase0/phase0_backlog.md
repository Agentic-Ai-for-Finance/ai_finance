# Phase 0 Backlog

Date: 2026-05-08
Phase: 0 (Product and Security Decisions)
Status: Complete

## Phase 0 Tickets

| ID | Task | Owner | Dependency | Size | Status |
|---|---|---|---|---|---|
| P0-01 | Approve public vs protected endpoint and data classification baseline | Product + Engineering | None | S | Complete |
| P0-02 | Finalize Phase 1 role model as `user` + `admin` | Product + Engineering | P0-01 | S | Complete |
| P0-03 | Lock auth provider decision, Clerk checkpoint, and Supabase Auth fallback rule | Product + Engineering | P0-02 | S | Complete |
| P0-04 | Lock backend authorization contract and protected route classes | Product + Engineering | P0-02, P0-03 | M | Complete |
| P0-05 | Lock Prompt Bar policy contract and read-only LLM limits | Product + Engineering | P0-01, P0-02 | M | Complete |
| P0-06 | Lock WhatsApp identity and authorization model | Product + Engineering | P0-03, P0-05 | M | Complete |
| P0-07 | Lock threat-model controls and mandatory Phase 1 controls | Product + Engineering | P0-04, P0-05, P0-06 | M | Complete |
| P0-08 | Produce Phase 1 implementation-ready task breakdown | Product + Engineering | P0-07 | L | Complete |
| P0-09 | Define Phase 1 acceptance tests for authorization and data minimization | Product + Engineering | P0-08 | M | Complete |
| P0-10 | Final Phase 0 sign-off and Phase 1 go/no-go checkpoint | Product + Engineering | P0-01..P0-09 | S | Complete |

## Phase 1 Kickoff Queue

| ID | Task | Owner | Dependency | Size | Notes |
|---|---|---|---|---|---|
| P1-01 | Auth foundation | Engineering | Phase 0 complete | L | Clerk in Next.js, server-side session validation, `user` / `admin` role resolution, static admin email allowlist, Clerk viability checkpoint on 2026-05-15 |
| P1-02 | User profile and onboarding preference foundation | Engineering | P1-01 | M | Store user-owned bank or institution defaults and use them as post-login default filters |
| P1-03 | RLS foundation | Engineering | P1-02 | M | Enable RLS on user-owned app tables and verify identity-bound policies |
| P1-04 | Public metrics API proxy | Engineering | P1-01 | L | Replace browser-direct reads with backend API routes, expose nominal/base DTOs only, IP rate limit 300/hour, manual emergency switch only for approved public reads |
| P1-05 | Protected analytics gateway foundation | Engineering | P1-01, P1-03 | L | Auth-required analysis and compare routes, allowlisted read-only intents, 120-month max, 5-entity max, summary-only responses, no export, shared quotas |
| P1-06 | Data exposure hardening | Engineering | P1-04, P1-05 | M | Audit grants, confirm no browser access to protected/internal objects, keep service role server-only, align DTOs to policy |
| P1-07 | Logging, errors, and abuse controls | Engineering | P1-04, P1-05 | M | Audit logs, redaction, structured errors, public and protected traffic observability |
| P1-08 | Acceptance tests | Engineering | P1-01..P1-07 | L | Authz, RLS isolation, DTO minimization, rate limits, read-only analysis, locked logged-out UX, saved bank defaults after login |

## Exit Criteria for Phase 0
- All Phase 0 decisions are written and locked in `plans/phases/phase0/`.
- Phase 1 is GO with no unresolved security or product policy blockers.
- The Phase 1 backlog is actionable without open role, auth, or data-classification questions.
