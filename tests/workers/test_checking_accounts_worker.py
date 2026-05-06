import asyncio
from datetime import date
from decimal import Decimal

from data.models.checking_accounts import (
    CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
    CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITHOUT_INTEREST,
    CMF_MEASURE_KIND_ACCOUNT_COUNT,
    CMF_MEASURE_KIND_NOMINAL_BALANCE,
    CheckingAccountsRawObservation,
)
from data.sources.checking_accounts import CheckingAccountsObservationBatch
from data.workers.checking_accounts_worker import (
    CheckingAccountsConfig,
    load_active_checking_accounts_configs,
    sync_checking_accounts_once,
)


class FakeResponse:
    def __init__(self, data=None):
        self.data = data or []


class FakeTable:
    def __init__(self, name, db):
        self.name = name
        self.db = db
        self._eq_filter = None
        self._upsert_payload = None
        self._upsert_kwargs = None

    def select(self, *_args):
        return self

    def eq(self, column, value):
        self._eq_filter = (column, value)
        return self

    def order(self, *_args, **_kwargs):
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

        if self.name == "cmf_datasets":
            rows = self.db["datasets"]
            if self._eq_filter is None:
                return FakeResponse(rows)
            column, value = self._eq_filter
            return FakeResponse([row for row in rows if row.get(column) == value])

        if self.name == "checking_accounts_curated":
            return FakeResponse(self.db.get("curated", []))

        if self.name == "uf_values":
            return FakeResponse(self.db["uf_values"].get(self._eq_filter[1], []))

        return FakeResponse()


class FakeSupabase:
    def __init__(self, datasets=None, curated=None, uf_values=None):
        self.db = {
            "datasets": datasets or [],
            "curated": curated or [],
            "uf_values": uf_values or {},
            "upserts": [],
        }

    def table(self, name):
        return FakeTable(name, self.db)

    @property
    def upserts(self):
        return self.db["upserts"]


def _config() -> CheckingAccountsConfig:
    return CheckingAccountsConfig(
        operation_type=CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITHOUT_INTEREST,
        dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
        account_count_dataset_code="checking_accounts_natural_person_without_interest_account_count",
        nominal_balance_dataset_code="checking_accounts_natural_person_without_interest_nominal_balance",
        account_count_source_tag="SBIF_CTACTE_NAT_AGIFI_NUM",
        nominal_balance_source_tag="SBIF_CTACTE_NAT_AGIFI_MM$",
        source_nombre="Cuentas corrientes sin pago de intereses de personas naturales",
        source_description="desc",
        source_endpoint_base="https://cmf.example",
        refresh_frequency="monthly",
        start_date=date(2021, 12, 1),
        account_count_start_date=date(2021, 12, 1),
        nominal_balance_start_date=date(2025, 2, 1),
    )


def _batch(period_month: date) -> CheckingAccountsObservationBatch:
    raw_observations = [
        CheckingAccountsRawObservation(
            account_type=CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITHOUT_INTEREST,
            dataset_code=CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
            source_series_id="301",
            source_codigo="SBIF_CTACTE_NAT_AGIFI_BICE_NUM",
            source_nombre="Banco BICE",
            institution_code="BICE",
            institution_name="Banco BICE",
            period_month=period_month,
            account_count=Decimal("2500"),
            nominal_balance_millions_clp=Decimal("120507.338"),
            source_payload={"account_count": {}, "nominal_balance_millions_clp": {}},
        )
    ]
    return CheckingAccountsObservationBatch(
        raw_observations=raw_observations,
        latest_source_month=period_month,
        earliest_source_month=period_month,
        latest_account_count_source_month=period_month,
        latest_nominal_balance_source_month=period_month,
    )


def test_load_active_checking_accounts_configs_groups_endpoint_rows():
    sb = FakeSupabase(
        datasets=[
            {
                "operation_type": CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITHOUT_INTEREST,
                "dataset_code": "checking_accounts_natural_person_without_interest_account_count",
                "measure_kind": CMF_MEASURE_KIND_ACCOUNT_COUNT,
                "source_tag": "SBIF_CTACTE_NAT_AGIFI_NUM",
                "source_nombre": "Natural without interest",
                "source_description": "desc",
                "source_endpoint_base": "https://cmf.example",
                "refresh_frequency": "monthly",
                "start_date": "2021-12-01",
                "is_active": True,
            },
            {
                "operation_type": CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITHOUT_INTEREST,
                "dataset_code": "checking_accounts_natural_person_without_interest_nominal_balance",
                "measure_kind": CMF_MEASURE_KIND_NOMINAL_BALANCE,
                "source_tag": "SBIF_CTACTE_NAT_AGIFI_MM$",
                "source_nombre": "Natural without interest",
                "source_description": "desc",
                "source_endpoint_base": "https://cmf.example",
                "refresh_frequency": "monthly",
                "start_date": "2025-02-01",
                "is_active": True,
            },
        ]
    )

    configs = load_active_checking_accounts_configs(sb)

    assert len(configs) == 1
    assert configs[0].dataset_code == CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST
    assert configs[0].account_count_start_date == date(2021, 12, 1)
    assert configs[0].nominal_balance_start_date == date(2025, 2, 1)


def test_sync_checking_accounts_once_skips_when_source_is_unchanged(monkeypatch):
    sb = FakeSupabase(curated=[{"period_month": "2026-04-01"}])
    events: list[str] = []

    async def _fake_batch(*_args, **_kwargs):
        return _batch(date(2026, 4, 1))

    monkeypatch.setattr(
        "data.workers.checking_accounts_worker.fetch_checking_accounts_batch",
        _fake_batch,
    )
    monkeypatch.setattr(
        "data.workers.checking_accounts_worker.get_latest_state_source_month",
        lambda _sb, _dataset_code: date(2026, 4, 1),
    )
    monkeypatch.setattr(
        "data.workers.checking_accounts_worker.record_sync_attempt",
        lambda _sb, dataset_code: events.append(f"attempt:{dataset_code}"),
    )
    monkeypatch.setattr(
        "data.workers.checking_accounts_worker.record_sync_success",
        lambda *_args, **_kwargs: events.append("success"),
    )
    monkeypatch.setattr(
        "data.workers.checking_accounts_worker.record_sync_failure",
        lambda *_args, **_kwargs: events.append("failure"),
    )

    synced = asyncio.run(
        sync_checking_accounts_once(
            object(),
            sb,
            config=_config(),
            run_date=date(2026, 5, 6),
        )
    )

    assert synced == 0
    assert not sb.upserts
    assert len([event for event in events if event.startswith("attempt:")]) == 2


def test_sync_checking_accounts_once_upserts_and_records_success(monkeypatch):
    sb = FakeSupabase(curated=[{"period_month": "2026-03-01"}], uf_values={"2026-04-15": [{"value": "40000"}]})
    events: list[str] = []

    async def _fake_batch(*_args, **_kwargs):
        return _batch(date(2026, 4, 1))

    monkeypatch.setattr(
        "data.workers.checking_accounts_worker.fetch_checking_accounts_batch",
        _fake_batch,
    )
    monkeypatch.setattr(
        "data.workers.checking_accounts_worker.get_latest_state_source_month",
        lambda _sb, _dataset_code: date(2026, 3, 1),
    )
    monkeypatch.setattr(
        "data.workers.checking_accounts_worker.record_sync_attempt",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        "data.workers.checking_accounts_worker.record_sync_success",
        lambda _sb, dataset_code, **_kwargs: events.append(dataset_code),
    )
    monkeypatch.setattr(
        "data.workers.checking_accounts_worker.record_sync_failure",
        lambda *_args, **_kwargs: None,
    )

    synced = asyncio.run(
        sync_checking_accounts_once(
            object(),
            sb,
            config=_config(),
            run_date=date(2026, 5, 6),
        )
    )

    assert synced == 1
    assert len(sb.upserts) == 2
    assert sb.upserts[0]["table"] == "checking_accounts_raw"
    assert sb.upserts[1]["table"] == "checking_accounts_curated"
    assert "checking_accounts_natural_person_without_interest_account_count" in events
    assert "checking_accounts_natural_person_without_interest_nominal_balance" in events
