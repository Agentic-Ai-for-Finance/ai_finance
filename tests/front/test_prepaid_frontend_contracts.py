from pathlib import Path


def test_prepaid_card_config_exposes_worlds_routes_and_supported_views():
    src = Path("front/lib/prepaid-card-config.ts").read_text()

    assert 'slug: "natural-person"' in src
    assert 'slug: "business"' in src
    assert 'slug: "purchases"' in src
    assert 'slug: "utilities"' in src
    assert 'slug: "atm-withdrawals"' in src
    assert 'slug: "total-activation-rate"' in src
    assert 'operation: "Purchases"' in src
    assert 'operation: "Utilities"' in src
    assert 'operation: "ATM Withdrawals"' in src
    assert 'key: "total-active-cards"' in src
    assert 'key: "total-cards-with-operations"' in src
    assert 'key: "total-activation-rate"' in src
    assert 'key: "supplementary-rate"' not in src


def test_prepaid_queries_use_api_proxy_routes():
    src = Path("front/lib/supabase-prepaid-queries.ts").read_text()

    assert "/api/v1/public/metrics?dataset=prepaid-card-ops" in src
    assert "/api/v1/public/metrics?dataset=prepaid-card-activation" in src
    assert '"/api/v1/protected/metrics"' in src


def test_prepaid_routes_and_shell_wiring_exist():
    page_src = Path("front/app/prepaid-cards/page.tsx").read_text()
    dynamic_src = Path(
        "front/app/prepaid-cards/[customerType]/[operation]/page.tsx"
    ).read_text()
    shell_src = Path("front/components/app-shell.tsx").read_text()
    nav_src = Path("front/lib/credit-card-config.ts").read_text()

    assert 'section="prepaid-cards"' in page_src
    assert "Natural Person: Purchases" in page_src
    assert "customerTypeFromSlug" in dynamic_src
    assert "PrepaidCardsDashboard" in dynamic_src
    assert "PrepaidCardSidebar" in shell_src
    assert (
        'slug: "natural-person"' in Path("front/lib/prepaid-card-config.ts").read_text()
    )
    assert 'slug: "business"' in Path("front/lib/prepaid-card-config.ts").read_text()
    assert "/prepaid-cards" in nav_src
