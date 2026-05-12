from pathlib import Path


def test_bank_presentation_uses_curated_corporate_palette_with_fallback():
    src = Path("front/lib/bank-presentation.ts").read_text()

    assert "const CORPORATE_BANK_COLORS: Record<string, string> = {" in src
    assert '"Líder BCI": "#0053E1"' in src
    assert 'Scotiabank: "#EC111A"' in src
    assert '"Banco Estado": "#FF7900"' in src
    assert '"Banco Ripley": "#523178"' in src
    assert 'CMF_RIPLEY: "#523178"' in src
    assert '"CMR Falabella": "#3B9326"' in src
    assert 'CMF_FALABELLA: "#3B9326"' in src
    assert 'BCI: "#FFD200"' in src
    assert '"Banco Itaú": "#EC7000"' in src
    assert "getHashedBankColor(institutionCode)" in src


def test_chart_and_selector_use_name_aware_bank_color_lookup():
    chart_src = Path("front/components/metric-line-chart.tsx").read_text()
    selector_src = Path("front/components/bank-selector.tsx").read_text()

    assert (
        "getBankColor(\n                  bank.institutionCode,\n                  bank.institutionName\n                )"
        in chart_src
    )
    assert "getBankColor(bank.institutionCode, bank.institutionName)" in selector_src
