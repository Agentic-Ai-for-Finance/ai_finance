from dataclasses import replace
from datetime import date
from decimal import Decimal

from data.models.checking_accounts import (
    CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
    CheckingAccountsRawObservation,
)
from data.transforms.checking_accounts import (
    to_curated_checking_accounts,
    uf_conversion_date,
)


def _raw_observation():
    return CheckingAccountsRawObservation(
        account_type="Natural Person Without Interest",
        dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
        source_series_id="301",
        source_codigo="SBIF_CTACTE_NAT_AGIFI_BICE_NUM",
        source_nombre="Banco BICE",
        institution_code="BICE",
        institution_name="Banco BICE",
        period_month=date(2026, 4, 1),
        account_count=Decimal("2500"),
        nominal_balance_millions_clp=Decimal("120507.338"),
        source_payload={
            "account_count": {"Fecha": "2026-04-01", "Valor": "2.500"},
            "nominal_balance_millions_clp": {
                "Fecha": "2026-04-01",
                "Valor": "120.507.338",
            },
        },
    )


def test_uf_conversion_date_uses_15th_day_of_same_month():
    assert uf_conversion_date(date(2026, 4, 1)) == date(2026, 4, 15)


def test_to_curated_checking_accounts_enriches_with_uf_and_average_balance():
    curated = to_curated_checking_accounts(
        [_raw_observation()],
        uf_lookup=lambda uf_date: {date(2026, 4, 15): Decimal("40000")}[uf_date],
    )

    assert len(curated) == 1
    assert curated[0].account_type == "Natural Person Without Interest"
    assert curated[0].dataset_code == CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST
    assert curated[0].institution_code == "BICE"
    assert curated[0].nominal_balance_millions_clp == Decimal("120507.338")
    assert curated[0].uf_value_used == Decimal("40000")
    assert curated[0].real_balance_uf == Decimal("3.01268345")
    assert curated[0].average_balance_uf == Decimal("1205.07338")


def test_to_curated_checking_accounts_handles_zero_account_count():
    raw = replace(
        _raw_observation(),
        account_count=Decimal("0"),
        nominal_balance_millions_clp=Decimal("0"),
    )

    curated = to_curated_checking_accounts(
        [raw],
        uf_lookup=lambda uf_date: {date(2026, 4, 15): Decimal("40000")}[uf_date],
    )

    assert len(curated) == 1
    assert curated[0].real_balance_uf == Decimal("0")
    assert curated[0].average_balance_uf == Decimal("0")


def test_to_curated_checking_accounts_caches_uf_lookup_per_month():
    raw_a = _raw_observation()
    raw_b = replace(
        _raw_observation(),
        institution_code="BCHI",
        institution_name="Banco de Chile",
        source_codigo="SBIF_CTACTE_NAT_AGIFI_BCHI_NUM",
    )
    lookup_calls: list[date] = []

    def lookup(uf_date: date) -> Decimal:
        lookup_calls.append(uf_date)
        return Decimal("40000")

    curated = to_curated_checking_accounts([raw_a, raw_b], uf_lookup=lookup)

    assert len(curated) == 2
    assert lookup_calls == [date(2026, 4, 15)]
