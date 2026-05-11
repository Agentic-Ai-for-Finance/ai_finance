from pathlib import Path


def test_checking_account_config_exposes_routes_and_supported_views():
    src = Path("front/lib/checking-account-config.ts").read_text()

    assert 'slug: "personas-naturales-sin-intereses"' in src
    assert 'slug: "personas-naturales-con-intereses"' in src
    assert 'slug: "personas-juridicas-sin-intereses"' in src
    assert 'slug: "personas-juridicas-con-intereses"' in src
    assert 'operation: "Natural Person Without Interest"' in src
    assert 'operation: "Natural Person With Interest"' in src
    assert 'operation: "Business Without Interest"' in src
    assert 'operation: "Business With Interest"' in src
    assert 'key: "volume"' in src
    assert 'key: "number-of-accounts"' in src
    assert 'key: "average-balance"' in src


def test_checking_account_queries_use_api_proxy_routes():
    src = Path("front/lib/supabase-checking-account-queries.ts").read_text()

    assert "/api/v1/public/metrics?dataset=checking-accounts" in src
    assert '"/api/v1/protected/metrics"' in src


def test_checking_account_routes_wire_to_operation_slug_model():
    page_src = Path("front/app/checking-accounts/page.tsx").read_text()
    dynamic_src = Path("front/app/checking-accounts/[operation]/page.tsx").read_text()
    shell_src = Path("front/lib/credit-card-config.ts").read_text()

    assert 'section="checking-accounts"' in page_src
    assert "operationFromSlug" in dynamic_src
    assert "CheckingAccountsDashboard" in dynamic_src
    assert "PlaceholderPanel" not in dynamic_src
    assert "notFound()" in dynamic_src
    assert "/checking-accounts" in shell_src
