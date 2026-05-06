from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any


CMF_DATASETS_TABLE = "cmf_datasets"
CMF_DATASET_SYNC_STATE_TABLE = "cmf_dataset_sync_state"
CHECKING_ACCOUNTS_RAW_TABLE = "checking_accounts_raw"
CHECKING_ACCOUNTS_CURATED_TABLE = "checking_accounts_curated"
CHECKING_ACCOUNTS_METRICS_VIEW = "checking_accounts_metrics"
CMF_MEASURE_KIND_ACCOUNT_COUNT = "account_count"
CMF_MEASURE_KIND_NOMINAL_BALANCE = "nominal_balance"

CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITHOUT_INTEREST = (
    "Natural Person Without Interest"
)
CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITH_INTEREST = (
    "Natural Person With Interest"
)
CHECKING_ACCOUNTS_OPERATION_BUSINESS_WITHOUT_INTEREST = "Business Without Interest"
CHECKING_ACCOUNTS_OPERATION_BUSINESS_WITH_INTEREST = "Business With Interest"

CHECKING_ACCOUNTS_OPERATION_TYPES = (
    CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITHOUT_INTEREST,
    CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITH_INTEREST,
    CHECKING_ACCOUNTS_OPERATION_BUSINESS_WITHOUT_INTEREST,
    CHECKING_ACCOUNTS_OPERATION_BUSINESS_WITH_INTEREST,
)

CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST = (
    "checking_accounts_natural_person_without_interest"
)
CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITH_INTEREST = (
    "checking_accounts_natural_person_with_interest"
)
CHECKING_ACCOUNTS_DATASET_BUSINESS_WITHOUT_INTEREST = (
    "checking_accounts_business_without_interest"
)
CHECKING_ACCOUNTS_DATASET_BUSINESS_WITH_INTEREST = (
    "checking_accounts_business_with_interest"
)


@dataclass(frozen=True)
class CheckingAccountsEndpointConfig:
    operation_type: str
    dataset_code: str
    measure_kind: str
    source_tag: str
    source_nombre: str
    source_description: str
    source_endpoint_base: str
    refresh_frequency: str
    start_date: date
    is_active: bool = True

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "CheckingAccountsEndpointConfig":
        return cls(
            operation_type=row["operation_type"],
            dataset_code=row["dataset_code"],
            measure_kind=row["measure_kind"],
            source_tag=row["source_tag"],
            source_nombre=row["source_nombre"],
            source_description=row["source_description"],
            source_endpoint_base=row["source_endpoint_base"],
            refresh_frequency=row["refresh_frequency"],
            start_date=date.fromisoformat(row["start_date"]),
            is_active=bool(row.get("is_active", True)),
        )


@dataclass(frozen=True)
class CheckingAccountsConfig:
    operation_type: str
    dataset_code: str
    account_count_dataset_code: str
    nominal_balance_dataset_code: str
    account_count_source_tag: str
    nominal_balance_source_tag: str
    source_nombre: str
    source_description: str
    source_endpoint_base: str
    refresh_frequency: str
    start_date: date
    account_count_start_date: date
    nominal_balance_start_date: date


@dataclass(frozen=True)
class CheckingAccountsMeasureObservation:
    operation_type: str
    dataset_code: str
    source_series_id: str
    source_codigo: str
    source_nombre: str
    institution_code: str
    institution_name: str
    period_month: date
    value: Decimal
    source_payload: dict[str, Any]


@dataclass(frozen=True)
class CheckingAccountsRawObservation:
    account_type: str
    dataset_code: str
    source_series_id: str
    source_codigo: str
    source_nombre: str
    institution_code: str
    institution_name: str
    period_month: date
    account_count: Decimal
    nominal_balance_millions_clp: Decimal
    source_payload: dict[str, Any]

    def to_row(self) -> dict[str, Any]:
        return {
            "account_type": self.account_type,
            "dataset_code": self.dataset_code,
            "source_series_id": self.source_series_id,
            "source_codigo": self.source_codigo,
            "source_nombre": self.source_nombre,
            "institution_code": self.institution_code,
            "institution_name": self.institution_name,
            "period_month": self.period_month.isoformat(),
            "account_count": str(self.account_count),
            "nominal_balance_millions_clp": str(self.nominal_balance_millions_clp),
            "source_payload": self.source_payload,
        }


@dataclass(frozen=True)
class CheckingAccountsCuratedObservation:
    account_type: str
    dataset_code: str
    institution_code: str
    institution_name: str
    period_month: date
    account_count: Decimal
    nominal_balance_millions_clp: Decimal
    uf_date_used: date
    uf_value_used: Decimal
    real_balance_uf: Decimal
    average_balance_uf: Decimal
    source_dataset_code: str

    def to_row(self) -> dict[str, Any]:
        return {
            "account_type": self.account_type,
            "dataset_code": self.dataset_code,
            "institution_code": self.institution_code,
            "institution_name": self.institution_name,
            "period_month": self.period_month.isoformat(),
            "account_count": str(self.account_count),
            "nominal_balance_millions_clp": str(self.nominal_balance_millions_clp),
            "uf_date_used": self.uf_date_used.isoformat(),
            "uf_value_used": str(self.uf_value_used),
            "real_balance_uf": str(self.real_balance_uf),
            "average_balance_uf": str(self.average_balance_uf),
            "source_dataset_code": self.source_dataset_code,
        }
