from datetime import date
from decimal import Decimal

from data.models.checking_accounts import (
    CHECKING_ACCOUNTS_CURATED_TABLE,
    CHECKING_ACCOUNTS_RAW_TABLE,
    CheckingAccountsCuratedObservation,
    CheckingAccountsRawObservation,
)


def latest_curated_checking_accounts_month(sb, *, dataset_code: str) -> date | None:
    response = (
        sb.table(CHECKING_ACCOUNTS_CURATED_TABLE)
        .select("period_month")
        .eq("dataset_code", dataset_code)
        .order("period_month", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return date.fromisoformat(response.data[0]["period_month"])


def earliest_curated_checking_accounts_month(sb, *, dataset_code: str) -> date | None:
    response = (
        sb.table(CHECKING_ACCOUNTS_CURATED_TABLE)
        .select("period_month")
        .eq("dataset_code", dataset_code)
        .order("period_month", desc=False)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return date.fromisoformat(response.data[0]["period_month"])


def get_uf_value_for_date(sb, uf_date: date) -> Decimal:
    response = (
        sb.table("uf_values")
        .select("value")
        .eq("uf_date", uf_date.isoformat())
        .limit(1)
        .execute()
    )

    if not response.data:
        raise ValueError(f"Missing UF value for {uf_date.isoformat()}")

    return Decimal(str(response.data[0]["value"]))


def upsert_checking_accounts_raw(
    sb,
    observations: list[CheckingAccountsRawObservation],
):
    if not observations:
        return None

    return (
        sb.table(CHECKING_ACCOUNTS_RAW_TABLE)
        .upsert(
            [observation.to_row() for observation in observations],
            on_conflict="dataset_code,source_codigo,period_month",
        )
        .execute()
    )


def upsert_checking_accounts_curated(
    sb,
    observations: list[CheckingAccountsCuratedObservation],
):
    if not observations:
        return None

    return (
        sb.table(CHECKING_ACCOUNTS_CURATED_TABLE)
        .upsert(
            [observation.to_row() for observation in observations],
            on_conflict="dataset_code,institution_code,period_month",
        )
        .execute()
    )
