from datetime import date
from decimal import Decimal

import pytest

from data.loaders.checking_accounts_loader import (
    earliest_curated_checking_accounts_month,
    get_uf_value_for_date,
    latest_curated_checking_accounts_month,
    upsert_checking_accounts_curated,
    upsert_checking_accounts_raw,
)
from data.models.checking_accounts import (
    CHECKING_ACCOUNTS_CURATED_TABLE,
    CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
    CHECKING_ACCOUNTS_RAW_TABLE,
    CheckingAccountsCuratedObservation,
    CheckingAccountsRawObservation,
)


class FakeResponse:
    def __init__(self, data=None):
        self.data = data or []


class FakeTable:
    def __init__(self, name, db):
        self.name = name
        self.db = db
        self._upsert_payload = None
        self._upsert_kwargs = None
        self._eq_filter = None

    def select(self, *_args):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._eq_filter = (column, value)
        return self

    def limit(self, *_args):
        return self

    def upsert(self, payload, **kwargs):
        self._upsert_payload = payload
        self._upsert_kwargs = kwargs
        return self

    def execute(self):
        if self._upsert_payload is not None:
            self.db["upserts"].append(
                {
                    "table": self.name,
                    "payload": self._upsert_payload,
                    "kwargs": self._upsert_kwargs,
                }
            )
            return FakeResponse()

        if self.name == "uf_values":
            return FakeResponse(self.db["uf_values"].get(self._eq_filter[1], []))

        if self.name == CHECKING_ACCOUNTS_CURATED_TABLE:
            return FakeResponse(self.db["curated"] or self.db["latest_curated"])

        return FakeResponse(self.db["latest_curated"])


class FakeSupabase:
    def __init__(self, latest_curated=None, uf_values=None, curated=None):
        self.db = {
            "latest_curated": latest_curated or [],
            "uf_values": uf_values or {},
            "curated": curated or [],
            "upserts": [],
        }

    def table(self, name):
        return FakeTable(name, self.db)

    @property
    def upserts(self):
        return self.db["upserts"]


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
        source_payload={},
    )


def _curated_observation():
    return CheckingAccountsCuratedObservation(
        account_type="Natural Person Without Interest",
        dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
        institution_code="BICE",
        institution_name="Banco BICE",
        period_month=date(2026, 4, 1),
        account_count=Decimal("2500"),
        nominal_balance_millions_clp=Decimal("120507.338"),
        uf_date_used=date(2026, 4, 15),
        uf_value_used=Decimal("40000"),
        real_balance_uf=Decimal("3.01268345"),
        average_balance_uf=Decimal("1205.07338"),
        source_dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
    )


def test_latest_curated_checking_accounts_month_returns_none_for_empty_table():
    assert (
        latest_curated_checking_accounts_month(
            FakeSupabase(),
            dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
        )
        is None
    )


def test_latest_curated_checking_accounts_month_reads_latest_row():
    sb = FakeSupabase(latest_curated=[{"period_month": "2026-04-01"}])

    assert (
        latest_curated_checking_accounts_month(
            sb, dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST
        )
        == date(2026, 4, 1)
    )


def test_earliest_curated_checking_accounts_month_reads_first_row():
    sb = FakeSupabase(curated=[{"period_month": "2025-01-01"}])

    assert (
        earliest_curated_checking_accounts_month(
            sb, dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST
        )
        == date(2025, 1, 1)
    )


def test_get_uf_value_for_date_returns_decimal_value():
    sb = FakeSupabase(uf_values={"2026-04-15": [{"value": "40000.25"}]})

    assert get_uf_value_for_date(sb, date(2026, 4, 15)) == Decimal("40000.25")


def test_get_uf_value_for_date_raises_when_missing():
    with pytest.raises(ValueError, match="Missing UF value for 2026-04-15"):
        get_uf_value_for_date(FakeSupabase(), date(2026, 4, 15))


def test_upsert_checking_accounts_raw_uses_idempotent_conflict_key():
    sb = FakeSupabase()

    upsert_checking_accounts_raw(sb, [_raw_observation()])

    assert sb.upserts[0]["table"] == CHECKING_ACCOUNTS_RAW_TABLE
    assert sb.upserts[0]["kwargs"] == {
        "on_conflict": "dataset_code,source_codigo,period_month"
    }


def test_upsert_checking_accounts_curated_uses_idempotent_conflict_key():
    sb = FakeSupabase()

    upsert_checking_accounts_curated(sb, [_curated_observation()])

    assert sb.upserts[0]["table"] == CHECKING_ACCOUNTS_CURATED_TABLE
    assert sb.upserts[0]["kwargs"] == {
        "on_conflict": "dataset_code,institution_code,period_month"
    }
    assert sb.upserts[0]["payload"][0]["average_balance_uf"] == "1205.07338"
