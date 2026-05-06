from datetime import date
from decimal import Decimal
from typing import Callable

from data.models.checking_accounts import (
    CheckingAccountsCuratedObservation,
    CheckingAccountsRawObservation,
)


def uf_conversion_date(period_month: date) -> date:
    return period_month.replace(day=15)


def to_curated_checking_accounts(
    raw_observations: list[CheckingAccountsRawObservation],
    *,
    uf_lookup: Callable[[date], Decimal],
) -> list[CheckingAccountsCuratedObservation]:
    curated_observations: list[CheckingAccountsCuratedObservation] = []

    for observation in raw_observations:
        uf_date = uf_conversion_date(observation.period_month)
        uf_value = uf_lookup(uf_date)
        nominal_balance_millions_clp = observation.nominal_balance_millions_clp
        real_balance_uf = nominal_balance_millions_clp / uf_value
        average_balance_uf = (
            real_balance_uf / observation.account_count
        ) * Decimal("1000000")

        curated_observations.append(
            CheckingAccountsCuratedObservation(
                account_type=observation.account_type,
                dataset_code=observation.dataset_code,
                institution_code=observation.institution_code,
                institution_name=observation.institution_name,
                period_month=observation.period_month,
                account_count=observation.account_count,
                nominal_balance_millions_clp=nominal_balance_millions_clp,
                uf_date_used=uf_date,
                uf_value_used=uf_value,
                real_balance_uf=real_balance_uf,
                average_balance_uf=average_balance_uf,
                source_dataset_code=observation.dataset_code,
            )
        )

    return sorted(
        curated_observations,
        key=lambda observation: (
            observation.account_type,
            observation.institution_code,
            observation.period_month,
        ),
    )
