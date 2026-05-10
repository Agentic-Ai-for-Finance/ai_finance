from pathlib import Path


def test_frontend_layout_and_shell_wire_clerk_auth():
    layout_src = Path("front/app/layout.tsx").read_text()
    shell_src = Path("front/components/app-shell.tsx").read_text()
    middleware_src = Path("front/middleware.ts").read_text()

    assert "ClerkProvider" in layout_src
    assert "SignInButton" in shell_src
    assert "UserButton" in shell_src
    assert "clerkMiddleware" in middleware_src
    assert '"/api/v1/protected(.*)"' in middleware_src
    assert '"/api/v1/preferences(.*)"' in middleware_src
    assert '"/api/v1/analysis(.*)"' in middleware_src
    assert '"/api/v1/compare(.*)"' in middleware_src
    assert '"/api/v1/admin(.*)"' in middleware_src


def test_frontend_dashboard_queries_and_locked_state_follow_phase1_boundary():
    credit_queries = Path("front/lib/supabase-queries.ts").read_text()
    credit_dashboard = Path("front/components/credit-cards-dashboard.tsx").read_text()
    debit_dashboard = Path("front/components/debit-cards-dashboard.tsx").read_text()
    prepaid_dashboard = Path("front/components/prepaid-cards-dashboard.tsx").read_text()
    checking_dashboard = Path("front/components/checking-accounts-dashboard.tsx").read_text()
    states_src = Path("front/components/dashboard-states.tsx").read_text()

    assert "/api/v1/public/metrics?dataset=credit-card-ops" in credit_queries
    assert "/api/v1/protected/metrics" in credit_queries
    assert "LockedMetricState" in states_src
    assert "requiresProtectedCreditCardMetric" in credit_dashboard
    assert "requiresProtectedDebitMetric" in debit_dashboard
    assert "requiresProtectedPrepaidMetric" in prepaid_dashboard
    assert "requiresProtectedCheckingMetric" in checking_dashboard
    assert "metric pill remains visible" in credit_dashboard
    access_src = Path("front/lib/dashboard-access.ts").read_text()
    assert 'return !["volume", "transactions"].includes(viewKey);' in access_src
    assert 'return viewKey === "average-balance";' in access_src
    assert "disabled={isTabLocked}" in credit_dashboard
    assert "disabled={isTabLocked}" in debit_dashboard
    assert "disabled={isTabLocked}" in prepaid_dashboard
    assert "disabled={isTabLocked}" in checking_dashboard


def test_phase1_api_surface_exists_for_public_protected_and_preferences():
    public_metrics = Path("front/app/api/v1/public/metrics/route.ts").read_text()
    protected_metrics = Path("front/app/api/v1/protected/metrics/route.ts").read_text()
    preferences = Path("front/app/api/v1/preferences/banks/route.ts").read_text()
    analysis = Path("front/app/api/v1/analysis/query/route.ts").read_text()
    compare = Path("front/app/api/v1/compare/query/route.ts").read_text()
    admin_audit = Path("front/app/api/v1/admin/audit/route.ts").read_text()

    assert "PUBLIC_LIMIT = 300" in public_metrics
    assert 'jsonError(401, "AUTH_REQUIRED"' in protected_metrics
    assert ".from(\"app_user_profiles\")" in preferences
    assert "120 months" in analysis
    assert "Only read-only SELECT-style operations are allowed." in analysis
    assert "2-5 entities" in compare
    assert ".from(\"app_audit_logs\")" in admin_audit
    assert "authEnv" in Path("front/app/api/v1/auth/session/route.ts").read_text()
    metric_api = Path("front/lib/server/metric-api.ts").read_text()
    assert "transaction_count,real_value_uf" in metric_api
    assert "account_count,real_balance_uf" in metric_api


def test_phase1_api_routes_log_security_events():
    analysis = Path("front/app/api/v1/analysis/query/route.ts").read_text()
    compare = Path("front/app/api/v1/compare/query/route.ts").read_text()
    preferences = Path("front/app/api/v1/preferences/banks/route.ts").read_text()
    admin_audit = Path("front/app/api/v1/admin/audit/route.ts").read_text()

    assert 'outcome: "rejected"' in analysis
    assert 'outcome: "rejected"' in compare
    assert 'eventType: "preference_read"' in preferences
    assert 'eventType: "preference_write"' in preferences
    assert 'eventType: "admin_audit_read"' in admin_audit
