from datetime import date
from decimal import Decimal
from typing import Callable

from data.models.prepaid_card_operations import (
    PREPAID_CARD_ACTIVE_CARDS_TOTAL_BUSINESS_DATASET,
    PREPAID_CARD_ACTIVE_CARDS_TOTAL_NATURAL_PERSON_DATASET,
    PREPAID_CARD_CARDS_WITH_OPERATIONS_BUSINESS_DATASET,
    PREPAID_CARD_CARDS_WITH_OPERATIONS_NATURAL_PERSON_DATASET,
    PREPAID_CARD_COUNTS_BUSINESS_DATASET,
    PREPAID_CARD_COUNTS_NATURAL_PERSON_DATASET,
    PrepaidCardCountsCuratedObservation,
    PrepaidCardCountRawObservation,
    PrepaidCardOpsCuratedObservation,
    PrepaidCardOpsRawObservation,
)


def uf_conversion_date(period_month: date) -> date:
    return period_month.replace(day=15)


def to_curated_prepaid_card_ops(
    raw_observations: list[PrepaidCardOpsRawObservation],
    *,
    uf_lookup: Callable[[date], Decimal],
    active_cards_lookup: Callable[[str, str, date], Decimal | None] | None = None,
) -> list[PrepaidCardOpsCuratedObservation]:
    curated_observations: list[PrepaidCardOpsCuratedObservation] = []

    for observation in raw_observations:
        uf_date = uf_conversion_date(observation.period_month)
        uf_value = uf_lookup(uf_date)
        real_value_uf = observation.nominal_volume_millions_clp / uf_value
        average_ticket_uf = (real_value_uf / observation.transaction_count) * Decimal(
            "1000000"
        )
        total_active_cards = (
            active_cards_lookup(
                observation.customer_type,
                observation.institution_code,
                observation.period_month,
            )
            if active_cards_lookup is not None
            else None
        )
        operations_per_active_card = None
        if total_active_cards not in (None, Decimal("0")):
            operations_per_active_card = (
                observation.transaction_count / total_active_cards
            )

        curated_observations.append(
            PrepaidCardOpsCuratedObservation(
                customer_type=observation.customer_type,
                operation_type=observation.operation_type,
                dataset_code=observation.dataset_code,
                institution_code=observation.institution_code,
                institution_name=observation.institution_name,
                period_month=observation.period_month,
                transaction_count=observation.transaction_count,
                nominal_volume_millions_clp=observation.nominal_volume_millions_clp,
                uf_date_used=uf_date,
                uf_value_used=uf_value,
                real_value_uf=real_value_uf,
                average_ticket_uf=average_ticket_uf,
                total_active_cards=total_active_cards,
                operations_per_active_card=operations_per_active_card,
                source_dataset_code=observation.dataset_code,
            )
        )

    return sorted(
        curated_observations,
        key=lambda observation: (
            observation.customer_type,
            observation.operation_type,
            observation.institution_code,
            observation.period_month,
        ),
    )


def to_curated_prepaid_card_counts(
    raw_observations: list[PrepaidCardCountRawObservation],
) -> list[PrepaidCardCountsCuratedObservation]:
    counts_by_key: dict[tuple[str, str, date], dict[str, Decimal | str]] = {}

    for observation in raw_observations:
        key = (
            observation.customer_type,
            observation.institution_code,
            observation.period_month,
        )
        row = counts_by_key.setdefault(
            key,
            {
                "institution_name": observation.institution_name,
                "total_active_cards": Decimal("0"),
                "total_cards_with_operations": Decimal("0"),
            },
        )
        row["institution_name"] = observation.institution_name

        if observation.dataset_code in {
            PREPAID_CARD_ACTIVE_CARDS_TOTAL_NATURAL_PERSON_DATASET,
            PREPAID_CARD_ACTIVE_CARDS_TOTAL_BUSINESS_DATASET,
        }:
            row["total_active_cards"] = (
                row["total_active_cards"] + observation.card_count
            )
        elif observation.dataset_code in {
            PREPAID_CARD_CARDS_WITH_OPERATIONS_NATURAL_PERSON_DATASET,
            PREPAID_CARD_CARDS_WITH_OPERATIONS_BUSINESS_DATASET,
        }:
            row["total_cards_with_operations"] = (
                row["total_cards_with_operations"] + observation.card_count
            )

    curated: list[PrepaidCardCountsCuratedObservation] = []
    for (customer_type, institution_code, period_month), row in sorted(
        counts_by_key.items()
    ):
        total_active_cards = row["total_active_cards"]
        total_cards_with_operations = row["total_cards_with_operations"]
        operations_rate = None
        if total_active_cards != Decimal("0"):
            operations_rate = total_cards_with_operations / total_active_cards
        curated.append(
            PrepaidCardCountsCuratedObservation(
                customer_type=customer_type,
                dataset_code=(
                    PREPAID_CARD_COUNTS_NATURAL_PERSON_DATASET
                    if customer_type == "Natural Person"
                    else PREPAID_CARD_COUNTS_BUSINESS_DATASET
                ),
                institution_code=institution_code,
                institution_name=str(row["institution_name"]),
                period_month=period_month,
                total_active_cards=total_active_cards,
                total_cards_with_operations=total_cards_with_operations,
                operations_rate=operations_rate,
            )
        )

    return curated
