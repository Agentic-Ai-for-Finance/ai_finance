from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any


CMF_DATASETS_TABLE = "cmf_datasets"
CMF_DATASET_SYNC_STATE_TABLE = "cmf_dataset_sync_state"
PREPAID_CARD_OPS_RAW_TABLE = "prepaid_card_ops_raw"
PREPAID_CARD_OPS_CURATED_TABLE = "prepaid_card_ops_curated"
PREPAID_CARD_OPS_METRICS_VIEW = "prepaid_card_ops_metrics"
PREPAID_CARD_COUNTS_RAW_TABLE = "prepaid_card_counts_raw"
PREPAID_CARD_COUNTS_CURATED_TABLE = "prepaid_card_counts_curated"
PREPAID_CARD_OPERATION_METRICS_VIEW = "prepaid_card_operation_metrics"
CMF_MEASURE_KIND_TRANSACTION_COUNT = "transaction_count"
CMF_MEASURE_KIND_NOMINAL_VOLUME = "nominal_volume"
CMF_MEASURE_KIND_ACTIVE_CARDS_TOTAL = "active_cards_total"
CMF_MEASURE_KIND_CARDS_WITH_OPERATIONS = "cards_with_operations"

PREPAID_CUSTOMER_TYPE_NATURAL_PERSON = "Natural Person"
PREPAID_CUSTOMER_TYPE_BUSINESS = "Business"
PREPAID_CUSTOMER_TYPES = (
    PREPAID_CUSTOMER_TYPE_NATURAL_PERSON,
    PREPAID_CUSTOMER_TYPE_BUSINESS,
)

PREPAID_CARD_OPERATION_PURCHASES = "Purchases"
PREPAID_CARD_OPERATION_UTILITIES = "Utilities"
PREPAID_CARD_OPERATION_ATM_WITHDRAWALS = "ATM Withdrawals"
PREPAID_CARD_OPERATION_RATE = "Total Activation Rate"
PREPAID_CARD_OPERATION_TYPES = (
    PREPAID_CARD_OPERATION_PURCHASES,
    PREPAID_CARD_OPERATION_UTILITIES,
    PREPAID_CARD_OPERATION_ATM_WITHDRAWALS,
)

PREPAID_CARD_OPS_NATURAL_PERSON_PURCHASES_DATASET = (
    "prepaid_card_ops_natural_person_purchases"
)
PREPAID_CARD_OPS_NATURAL_PERSON_UTILITIES_DATASET = (
    "prepaid_card_ops_natural_person_utilities"
)
PREPAID_CARD_OPS_NATURAL_PERSON_ATM_WITHDRAWALS_DATASET = (
    "prepaid_card_ops_natural_person_atm_withdrawals"
)
PREPAID_CARD_OPS_BUSINESS_PURCHASES_DATASET = "prepaid_card_ops_business_purchases"
PREPAID_CARD_OPS_BUSINESS_UTILITIES_DATASET = "prepaid_card_ops_business_utilities"
PREPAID_CARD_OPS_BUSINESS_ATM_WITHDRAWALS_DATASET = (
    "prepaid_card_ops_business_atm_withdrawals"
)

PREPAID_CARD_COUNTS_NATURAL_PERSON_DATASET = "prepaid_card_counts_natural_person"
PREPAID_CARD_COUNTS_BUSINESS_DATASET = "prepaid_card_counts_business"
PREPAID_CARD_ACTIVE_CARDS_TOTAL_NATURAL_PERSON_DATASET = (
    "prepaid_card_active_cards_total_natural_person"
)
PREPAID_CARD_CARDS_WITH_OPERATIONS_NATURAL_PERSON_DATASET = (
    "prepaid_card_cards_with_operations_natural_person"
)
PREPAID_CARD_ACTIVE_CARDS_TOTAL_BUSINESS_DATASET = (
    "prepaid_card_active_cards_total_business"
)
PREPAID_CARD_CARDS_WITH_OPERATIONS_BUSINESS_DATASET = (
    "prepaid_card_cards_with_operations_business"
)

CMF_PREPAID_CARDS_START_DATE = "20090401"


@dataclass(frozen=True)
class PrepaidCardEndpointConfig:
    customer_type: str
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
    def from_row(cls, row: dict[str, Any]) -> "PrepaidCardEndpointConfig":
        return cls(
            customer_type=row["customer_type"],
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
class PrepaidCardOperationConfig:
    customer_type: str
    operation_type: str
    dataset_code: str
    transaction_count_dataset_code: str
    nominal_volume_dataset_code: str
    transaction_count_source_tag: str
    nominal_volume_source_tag: str
    source_nombre: str
    source_description: str
    source_endpoint_base: str
    refresh_frequency: str
    start_date: date


@dataclass(frozen=True)
class PrepaidCardCountsConfig:
    customer_type: str
    dataset_code: str
    active_cards_total_dataset_code: str
    cards_with_operations_dataset_code: str
    active_cards_total_source_tag: str
    cards_with_operations_source_tag: str
    source_endpoint_base: str
    refresh_frequency: str
    start_date: date


@dataclass(frozen=True)
class PrepaidCardOpsMeasureObservation:
    customer_type: str
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
class PrepaidCardOpsRawObservation:
    customer_type: str
    operation_type: str
    dataset_code: str
    source_series_id: str
    source_codigo: str
    source_nombre: str
    institution_code: str
    institution_name: str
    period_month: date
    transaction_count: Decimal
    nominal_volume_millions_clp: Decimal
    source_payload: dict[str, Any]

    def to_row(self) -> dict[str, Any]:
        return {
            "customer_type": self.customer_type,
            "operation_type": self.operation_type,
            "dataset_code": self.dataset_code,
            "source_series_id": self.source_series_id,
            "source_codigo": self.source_codigo,
            "source_nombre": self.source_nombre,
            "institution_code": self.institution_code,
            "institution_name": self.institution_name,
            "period_month": self.period_month.isoformat(),
            "transaction_count": str(self.transaction_count),
            "nominal_volume_millions_clp": str(self.nominal_volume_millions_clp),
            "source_payload": self.source_payload,
        }


@dataclass(frozen=True)
class PrepaidCardOpsCuratedObservation:
    customer_type: str
    operation_type: str
    dataset_code: str
    institution_code: str
    institution_name: str
    period_month: date
    transaction_count: Decimal
    nominal_volume_millions_clp: Decimal
    uf_date_used: date
    uf_value_used: Decimal
    real_value_uf: Decimal
    average_ticket_uf: Decimal
    total_active_cards: Decimal | None
    operations_per_active_card: Decimal | None
    source_dataset_code: str

    def to_row(self) -> dict[str, Any]:
        return {
            "customer_type": self.customer_type,
            "operation_type": self.operation_type,
            "dataset_code": self.dataset_code,
            "institution_code": self.institution_code,
            "institution_name": self.institution_name,
            "period_month": self.period_month.isoformat(),
            "transaction_count": str(self.transaction_count),
            "nominal_volume_millions_clp": str(self.nominal_volume_millions_clp),
            "uf_date_used": self.uf_date_used.isoformat(),
            "uf_value_used": str(self.uf_value_used),
            "real_value_uf": str(self.real_value_uf),
            "average_ticket_uf": str(self.average_ticket_uf),
            "total_active_cards": None
            if self.total_active_cards is None
            else str(self.total_active_cards),
            "operations_per_active_card": None
            if self.operations_per_active_card is None
            else str(self.operations_per_active_card),
            "source_dataset_code": self.source_dataset_code,
        }


@dataclass(frozen=True)
class PrepaidCardCountObservation:
    customer_type: str
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
class PrepaidCardCountRawObservation:
    customer_type: str
    dataset_code: str
    source_series_id: str
    source_codigo: str
    source_nombre: str
    institution_code: str
    institution_name: str
    period_month: date
    card_count: Decimal
    source_payload: dict[str, Any]

    def to_row(self) -> dict[str, Any]:
        return {
            "customer_type": self.customer_type,
            "dataset_code": self.dataset_code,
            "source_series_id": self.source_series_id,
            "source_codigo": self.source_codigo,
            "source_nombre": self.source_nombre,
            "institution_code": self.institution_code,
            "institution_name": self.institution_name,
            "period_month": self.period_month.isoformat(),
            "card_count": str(self.card_count),
            "source_payload": self.source_payload,
        }


@dataclass(frozen=True)
class PrepaidCardCountsCuratedObservation:
    customer_type: str
    dataset_code: str
    institution_code: str
    institution_name: str
    period_month: date
    total_active_cards: Decimal
    total_cards_with_operations: Decimal
    operations_rate: Decimal | None

    def to_row(self) -> dict[str, Any]:
        return {
            "customer_type": self.customer_type,
            "dataset_code": self.dataset_code,
            "institution_code": self.institution_code,
            "institution_name": self.institution_name,
            "period_month": self.period_month.isoformat(),
            "total_active_cards": str(self.total_active_cards),
            "total_cards_with_operations": str(self.total_cards_with_operations),
            "operations_rate": None
            if self.operations_rate is None
            else str(self.operations_rate),
        }
