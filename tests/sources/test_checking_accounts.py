from datetime import date
from decimal import Decimal

import pytest

from data.models.checking_accounts import (
    CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
)
from data.sources.checking_accounts import (
    build_cmf_cuadros_url,
    derive_institution_code,
    merge_measure_observations,
    normalize_period_month,
    parse_account_count_payload,
    parse_cmf_numeric,
    parse_nominal_balance_payload,
)


def _payload(*, series_id: int, codigo: str, nombre: str, values: list[tuple[str, str]]):
    return {
        "series": [
            {
                "id": series_id,
                "Codigo": codigo,
                "Nombre": nombre,
                "data": [{"Fecha": fecha, "Valor": valor} for fecha, valor in values],
            }
        ]
    }


def test_build_cmf_cuadros_url_for_checking_accounts_endpoint():
    url = build_cmf_cuadros_url(
        endpoint_base="https://best-sbif-api.azurewebsites.net/Cuadrosv2",
        tag="SBIF_CTACTE_NAT_AGIFI_NUM",
        fecha_fin=date(2026, 4, 24),
        fecha_inicio="20211201",
    )

    assert url == (
        "https://best-sbif-api.azurewebsites.net/Cuadrosv2?"
        "FechaFin=20260424&FechaInicio=20211201&"
        "Tag=SBIF_CTACTE_NAT_AGIFI_NUM&from=reload"
    )


def test_derive_institution_code_from_checking_source_codes():
    assert derive_institution_code("SBIF_CTACTE_NAT_AGIFI_BICE_NUM") == "BICE"
    assert derive_institution_code("SBIF_CTACTE_CINT_JUR_AGIFI_ITAU_MM$") == "ITAU"


def test_parse_cmf_numeric_accepts_string_values():
    assert parse_cmf_numeric("1.234.567") == Decimal("1234567")
    assert parse_cmf_numeric("1234,50") == Decimal("1234.50")


def test_normalize_period_month_accepts_common_source_formats():
    assert normalize_period_month("2026-04-24") == date(2026, 4, 1)
    assert normalize_period_month("24-04-2026") == date(2026, 4, 1)
    assert normalize_period_month("202604") == date(2026, 4, 1)
    assert normalize_period_month("2026-04") == date(2026, 4, 1)


def test_parse_account_count_payload_normalizes_observations():
    payload = _payload(
        series_id=101,
        codigo="SBIF_CTACTE_NAT_AGIFI_BICE_NUM",
        nombre="Banco BICE",
        values=[("2026-03-01", "1.234"), ("2026-04-01", "2.500")],
    )

    observations = parse_account_count_payload(
        payload,
        account_type="Natural Person Without Interest",
        dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
    )

    assert len(observations) == 2
    assert observations[0].dataset_code == CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST
    assert observations[0].institution_code == "BICE"
    assert observations[0].period_month == date(2026, 3, 1)
    assert observations[0].value == Decimal("1234")


def test_merge_measure_observations_builds_raw_rows():
    account_count_observations = parse_account_count_payload(
        _payload(
            series_id=101,
            codigo="SBIF_CTACTE_NAT_AGIFI_BICE_NUM",
            nombre="Banco BICE",
            values=[("2026-04-01", "2.500")],
        ),
        account_type="Natural Person Without Interest",
        dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
    )
    nominal_balance_observations = parse_nominal_balance_payload(
        _payload(
            series_id=301,
            codigo="SBIF_CTACTE_NAT_AGIFI_BICE_MM$",
            nombre="Banco BICE",
            values=[("2026-04-01", "120.507.338")],
        ),
        account_type="Natural Person Without Interest",
        dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
    )

    observations = merge_measure_observations(
        account_type="Natural Person Without Interest",
        dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
        account_count_observations=account_count_observations,
        nominal_balance_observations=nominal_balance_observations,
    )

    assert len(observations) == 1
    assert observations[0].account_type == "Natural Person Without Interest"
    assert observations[0].dataset_code == CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST
    assert observations[0].account_count == Decimal("2500")
    assert observations[0].nominal_balance_millions_clp == Decimal("120507338")


def test_derive_institution_code_raises_when_agifi_is_missing():
    with pytest.raises(ValueError, match="Cannot derive institution_code"):
        derive_institution_code("SBIF_CTACTE_NAT_BICE_NUM")
