import asyncio
import logging
import os
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

import httpx
from dotenv import load_dotenv
from supabase import create_client

from data.loaders.bank_credit_card_ops_sync_state_loader import (
    get_latest_state_source_month,
    record_sync_attempt,
    record_sync_failure,
    record_sync_success,
)
from data.loaders.prepaid_card_ops_loader import (
    earliest_curated_card_count_month,
    earliest_curated_operation_month,
    get_uf_value_for_date,
    upsert_prepaid_card_count_raw,
    upsert_prepaid_card_counts_curated,
    upsert_prepaid_card_ops_curated,
    upsert_prepaid_card_ops_raw,
)
from data.models.prepaid_card_operations import (
    CMF_DATASETS_TABLE,
    CMF_MEASURE_KIND_ACTIVE_CARDS_TOTAL,
    CMF_MEASURE_KIND_CARDS_WITH_OPERATIONS,
    CMF_MEASURE_KIND_NOMINAL_VOLUME,
    CMF_MEASURE_KIND_TRANSACTION_COUNT,
    PREPAID_CARD_COUNTS_BUSINESS_DATASET,
    PREPAID_CARD_COUNTS_NATURAL_PERSON_DATASET,
    PREPAID_CARD_OPERATION_ATM_WITHDRAWALS,
    PREPAID_CARD_OPERATION_PURCHASES,
    PREPAID_CARD_OPERATION_UTILITIES,
    PREPAID_CARD_OPS_BUSINESS_ATM_WITHDRAWALS_DATASET,
    PREPAID_CARD_OPS_BUSINESS_PURCHASES_DATASET,
    PREPAID_CARD_OPS_BUSINESS_UTILITIES_DATASET,
    PREPAID_CARD_OPS_NATURAL_PERSON_ATM_WITHDRAWALS_DATASET,
    PREPAID_CARD_OPS_NATURAL_PERSON_PURCHASES_DATASET,
    PREPAID_CARD_OPS_NATURAL_PERSON_UTILITIES_DATASET,
    PREPAID_CUSTOMER_TYPE_BUSINESS,
    PREPAID_CUSTOMER_TYPE_NATURAL_PERSON,
    PrepaidCardCountsConfig,
    PrepaidCardEndpointConfig,
    PrepaidCardOperationConfig,
)
from data.sources.prepaid_card_operations import (
    fetch_card_counts_batch,
    fetch_operation_batch,
)
from data.transforms.prepaid_card_ops import (
    to_curated_prepaid_card_counts,
    to_curated_prepaid_card_ops,
)

DAILY_INTERVAL_S = 24 * 60 * 60
DEFAULT_CMF_ENDPOINT_BASE = "https://best-sbif-api.azurewebsites.net/Cuadrosv2"

log = logging.getLogger("prepaid-card-ops-worker")


@dataclass(frozen=True)
class PrepaidCardOpsWorkerConfig:
    supabase_url: str
    supabase_service_role_key: str
    endpoint_base: str = DEFAULT_CMF_ENDPOINT_BASE
    sync_interval_s: int = DAILY_INTERVAL_S


def load_config() -> PrepaidCardOpsWorkerConfig:
    load_dotenv()
    return PrepaidCardOpsWorkerConfig(
        supabase_url=os.environ["SUPABASE_URL"],
        supabase_service_role_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        endpoint_base=os.environ.get(
            "BASE_ENDPOINT_CMF_CARDS", DEFAULT_CMF_ENDPOINT_BASE
        ),
    )


def operation_dataset_code(customer_type: str, operation_type: str) -> str:
    datasets = {
        (
            PREPAID_CUSTOMER_TYPE_NATURAL_PERSON,
            PREPAID_CARD_OPERATION_PURCHASES,
        ): PREPAID_CARD_OPS_NATURAL_PERSON_PURCHASES_DATASET,
        (
            PREPAID_CUSTOMER_TYPE_NATURAL_PERSON,
            PREPAID_CARD_OPERATION_UTILITIES,
        ): PREPAID_CARD_OPS_NATURAL_PERSON_UTILITIES_DATASET,
        (
            PREPAID_CUSTOMER_TYPE_NATURAL_PERSON,
            PREPAID_CARD_OPERATION_ATM_WITHDRAWALS,
        ): PREPAID_CARD_OPS_NATURAL_PERSON_ATM_WITHDRAWALS_DATASET,
        (
            PREPAID_CUSTOMER_TYPE_BUSINESS,
            PREPAID_CARD_OPERATION_PURCHASES,
        ): PREPAID_CARD_OPS_BUSINESS_PURCHASES_DATASET,
        (
            PREPAID_CUSTOMER_TYPE_BUSINESS,
            PREPAID_CARD_OPERATION_UTILITIES,
        ): PREPAID_CARD_OPS_BUSINESS_UTILITIES_DATASET,
        (
            PREPAID_CUSTOMER_TYPE_BUSINESS,
            PREPAID_CARD_OPERATION_ATM_WITHDRAWALS,
        ): PREPAID_CARD_OPS_BUSINESS_ATM_WITHDRAWALS_DATASET,
    }
    try:
        return datasets[(customer_type, operation_type)]
    except KeyError as exc:
        raise ValueError(
            f"Unsupported prepaid operation config: {customer_type} / {operation_type}"
        ) from exc


def load_active_operation_configs(sb) -> list[PrepaidCardOperationConfig]:
    response = (
        sb.table(CMF_DATASETS_TABLE)
        .select(
            "customer_type,operation_type,dataset_code,measure_kind,source_tag,source_nombre,"
            "source_description,source_endpoint_base,refresh_frequency,start_date,is_active"
        )
        .eq("is_active", True)
        .not_.is_("customer_type", "null")
        .execute()
    )
    endpoints_by_key: dict[tuple[str, str], dict[str, PrepaidCardEndpointConfig]] = {}
    for row in response.data or []:
        if (
            not row.get("customer_type")
            or not row.get("operation_type")
            or not row.get("measure_kind")
            or not row.get("source_tag")
        ):
            continue
        if row["measure_kind"] not in {
            CMF_MEASURE_KIND_TRANSACTION_COUNT,
            CMF_MEASURE_KIND_NOMINAL_VOLUME,
        }:
            continue
        endpoint = PrepaidCardEndpointConfig.from_row(row)
        endpoints_by_key.setdefault(
            (endpoint.customer_type, endpoint.operation_type), {}
        )[endpoint.measure_kind] = endpoint

    operations: list[PrepaidCardOperationConfig] = []
    for (customer_type, operation_type), endpoint_group in endpoints_by_key.items():
        transaction_count_endpoint = endpoint_group.get(
            CMF_MEASURE_KIND_TRANSACTION_COUNT
        )
        nominal_volume_endpoint = endpoint_group.get(CMF_MEASURE_KIND_NOMINAL_VOLUME)
        if transaction_count_endpoint is None or nominal_volume_endpoint is None:
            continue
        operations.append(
            PrepaidCardOperationConfig(
                customer_type=customer_type,
                operation_type=operation_type,
                dataset_code=operation_dataset_code(customer_type, operation_type),
                transaction_count_dataset_code=transaction_count_endpoint.dataset_code,
                nominal_volume_dataset_code=nominal_volume_endpoint.dataset_code,
                transaction_count_source_tag=transaction_count_endpoint.source_tag,
                nominal_volume_source_tag=nominal_volume_endpoint.source_tag,
                source_nombre=transaction_count_endpoint.source_nombre,
                source_description=transaction_count_endpoint.source_description,
                source_endpoint_base=transaction_count_endpoint.source_endpoint_base,
                refresh_frequency=transaction_count_endpoint.refresh_frequency,
                start_date=transaction_count_endpoint.start_date,
            )
        )

    return sorted(operations, key=lambda operation: operation.dataset_code)


def load_active_card_counts_configs(sb) -> list[PrepaidCardCountsConfig]:
    response = (
        sb.table(CMF_DATASETS_TABLE)
        .select(
            "customer_type,operation_type,dataset_code,measure_kind,source_tag,source_nombre,"
            "source_description,source_endpoint_base,refresh_frequency,start_date,is_active"
        )
        .eq("is_active", True)
        .eq("operation_type", "Total Activation Rate")
        .not_.is_("customer_type", "null")
        .execute()
    )

    endpoints_by_customer_type: dict[str, dict[str, PrepaidCardEndpointConfig]] = {}
    for row in response.data or []:
        if row.get("measure_kind") not in {
            CMF_MEASURE_KIND_ACTIVE_CARDS_TOTAL,
            CMF_MEASURE_KIND_CARDS_WITH_OPERATIONS,
        }:
            continue
        endpoint = PrepaidCardEndpointConfig.from_row(row)
        endpoints_by_customer_type.setdefault(endpoint.customer_type, {})[
            endpoint.measure_kind
        ] = endpoint

    configs: list[PrepaidCardCountsConfig] = []
    for customer_type, endpoint_group in endpoints_by_customer_type.items():
        active_cards_total = endpoint_group.get(CMF_MEASURE_KIND_ACTIVE_CARDS_TOTAL)
        cards_with_operations = endpoint_group.get(
            CMF_MEASURE_KIND_CARDS_WITH_OPERATIONS
        )
        if active_cards_total is None or cards_with_operations is None:
            continue
        configs.append(
            PrepaidCardCountsConfig(
                customer_type=customer_type,
                dataset_code=(
                    PREPAID_CARD_COUNTS_NATURAL_PERSON_DATASET
                    if customer_type == PREPAID_CUSTOMER_TYPE_NATURAL_PERSON
                    else PREPAID_CARD_COUNTS_BUSINESS_DATASET
                ),
                active_cards_total_dataset_code=active_cards_total.dataset_code,
                cards_with_operations_dataset_code=cards_with_operations.dataset_code,
                active_cards_total_source_tag=active_cards_total.source_tag,
                cards_with_operations_source_tag=cards_with_operations.source_tag,
                source_endpoint_base=active_cards_total.source_endpoint_base,
                refresh_frequency=active_cards_total.refresh_frequency,
                start_date=min(
                    active_cards_total.start_date, cards_with_operations.start_date
                ),
            )
        )
    return sorted(configs, key=lambda config: config.dataset_code)


def build_active_cards_lookup(sb):
    page_size = 1000
    offset = 0
    totals: dict[tuple[str, str, date], Decimal] = {}

    while True:
        response = (
            sb.table("prepaid_card_counts_curated")
            .select("customer_type,institution_code,period_month,total_active_cards")
            .order("customer_type", desc=False)
            .order("institution_code", desc=False)
            .order("period_month", desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = response.data or []
        for row in rows:
            if row.get("total_active_cards") is None:
                continue
            totals[
                (
                    row["customer_type"],
                    row["institution_code"],
                    date.fromisoformat(row["period_month"]),
                )
            ] = Decimal(str(row["total_active_cards"]))
        if len(rows) < page_size:
            break
        offset += page_size

    def lookup(
        customer_type: str, institution_code: str, period_month: date
    ) -> Decimal | None:
        return totals.get((customer_type, institution_code, period_month))

    return lookup


async def sync_operation_once(
    client: httpx.AsyncClient, sb, *, config: PrepaidCardOperationConfig, run_date: date
) -> int:
    record_sync_attempt(sb, config.transaction_count_dataset_code)
    record_sync_attempt(sb, config.nominal_volume_dataset_code)
    try:
        batch = await fetch_operation_batch(client, config=config, fecha_fin=run_date)
        if batch.latest_source_month is None:
            log.info("Skipping %s: source returned no rows.", config.dataset_code)
            return 0

        latest_transaction_count_state_month = get_latest_state_source_month(
            sb, config.transaction_count_dataset_code
        )
        latest_nominal_volume_state_month = get_latest_state_source_month(
            sb, config.nominal_volume_dataset_code
        )
        earliest_curated_month = earliest_curated_operation_month(
            sb, dataset_code=config.dataset_code
        )
        transaction_count_unchanged = (
            batch.latest_transaction_count_source_month is None
            or (
                latest_transaction_count_state_month is not None
                and batch.latest_transaction_count_source_month
                <= latest_transaction_count_state_month
            )
        )
        nominal_volume_unchanged = batch.latest_nominal_volume_source_month is None or (
            latest_nominal_volume_state_month is not None
            and batch.latest_nominal_volume_source_month
            <= latest_nominal_volume_state_month
        )
        history_is_complete = batch.earliest_source_month is None or (
            earliest_curated_month is not None
            and earliest_curated_month <= batch.earliest_source_month
        )
        if (
            transaction_count_unchanged
            and nominal_volume_unchanged
            and history_is_complete
        ):
            log.info(
                "Skipping %s: latest source month is unchanged.", config.dataset_code
            )
            return 0

        curated_observations = to_curated_prepaid_card_ops(
            batch.raw_observations,
            uf_lookup=lambda uf_date: get_uf_value_for_date(sb, uf_date),
            active_cards_lookup=build_active_cards_lookup(sb),
        )
        upsert_prepaid_card_ops_raw(sb, batch.raw_observations)
        upsert_prepaid_card_ops_curated(sb, curated_observations)
    except Exception as exc:
        record_sync_failure(
            sb, dataset_code=config.transaction_count_dataset_code, error=exc
        )
        record_sync_failure(
            sb, dataset_code=config.nominal_volume_dataset_code, error=exc
        )
        raise

    record_sync_success(
        sb,
        dataset_code=config.transaction_count_dataset_code,
        latest_source_month=batch.latest_transaction_count_source_month
        or batch.latest_source_month,
        latest_curated_month=batch.latest_source_month,
    )
    record_sync_success(
        sb,
        dataset_code=config.nominal_volume_dataset_code,
        latest_source_month=batch.latest_nominal_volume_source_month
        or batch.latest_source_month,
        latest_curated_month=batch.latest_source_month,
    )
    return len(batch.raw_observations)


async def sync_card_counts_once(
    client: httpx.AsyncClient, sb, *, config: PrepaidCardCountsConfig, run_date: date
) -> int:
    dataset_codes = [
        config.active_cards_total_dataset_code,
        config.cards_with_operations_dataset_code,
    ]
    for dataset_code in dataset_codes:
        record_sync_attempt(sb, dataset_code)

    try:
        batch = await fetch_card_counts_batch(client, config=config, fecha_fin=run_date)
        if batch.latest_source_month is None:
            log.info("Skipping %s: source returned no rows.", config.dataset_code)
            return 0

        latest_state_months = {
            dataset_code: get_latest_state_source_month(sb, dataset_code)
            for dataset_code in dataset_codes
        }
        latest_batch_months = {
            config.active_cards_total_dataset_code: batch.latest_active_cards_total_source_month,
            config.cards_with_operations_dataset_code: batch.latest_cards_with_operations_source_month,
        }
        all_unchanged = True
        for dataset_code, latest_source_month in latest_batch_months.items():
            current_state_month = latest_state_months[dataset_code]
            if latest_source_month is None:
                continue
            if current_state_month is None or latest_source_month > current_state_month:
                all_unchanged = False
                break

        earliest_curated_month = earliest_curated_card_count_month(
            sb, dataset_code=config.dataset_code
        )
        history_is_complete = batch.earliest_source_month is None or (
            earliest_curated_month is not None
            and earliest_curated_month <= batch.earliest_source_month
        )
        if all_unchanged and history_is_complete:
            log.info(
                "Skipping %s: latest source month is unchanged.", config.dataset_code
            )
            return 0

        curated_observations = to_curated_prepaid_card_counts(batch.raw_observations)
        upsert_prepaid_card_count_raw(sb, batch.raw_observations)
        upsert_prepaid_card_counts_curated(sb, curated_observations)
    except Exception as exc:
        for dataset_code in dataset_codes:
            record_sync_failure(sb, dataset_code=dataset_code, error=exc)
        raise

    latest_source_months = {
        config.active_cards_total_dataset_code: batch.latest_active_cards_total_source_month,
        config.cards_with_operations_dataset_code: batch.latest_cards_with_operations_source_month,
    }
    for dataset_code, latest_source_month in latest_source_months.items():
        if latest_source_month is None:
            continue
        record_sync_success(
            sb,
            dataset_code=dataset_code,
            latest_source_month=latest_source_month,
            latest_curated_month=batch.latest_source_month,
        )

    return len(batch.raw_observations)


async def sync_all_prepaid_card_ops_once(
    client: httpx.AsyncClient,
    sb,
    *,
    config: PrepaidCardOpsWorkerConfig,
    run_date: date,
    operations: list[PrepaidCardOperationConfig] | None = None,
    card_counts: list[PrepaidCardCountsConfig] | None = None,
) -> dict[str, int]:
    results: dict[str, int] = {}

    for counts_config in card_counts or load_active_card_counts_configs(sb):
        try:
            results[counts_config.dataset_code] = await sync_card_counts_once(
                client, sb, config=counts_config, run_date=run_date
            )
        except Exception as exc:
            log.warning(
                "Prepaid card counts %s failed: %s: %s",
                counts_config.dataset_code,
                type(exc).__name__,
                exc,
            )
            results[counts_config.dataset_code] = 0

    for operation in operations or load_active_operation_configs(sb):
        try:
            results[operation.dataset_code] = await sync_operation_once(
                client, sb, config=operation, run_date=run_date
            )
        except Exception as exc:
            log.warning(
                "Prepaid card operation %s failed: %s: %s",
                operation.dataset_code,
                type(exc).__name__,
                exc,
            )
            results[operation.dataset_code] = 0

    return results


async def run_worker(config: PrepaidCardOpsWorkerConfig | None = None) -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    worker_config = config or load_config()
    sb = create_client(
        worker_config.supabase_url, worker_config.supabase_service_role_key
    )

    async with httpx.AsyncClient() as client:
        while True:
            try:
                await sync_all_prepaid_card_ops_once(
                    client, sb, config=worker_config, run_date=date.today()
                )
            except Exception as exc:
                log.warning(
                    "Prepaid card ops sync failed: %s: %s", type(exc).__name__, exc
                )

            await asyncio.sleep(worker_config.sync_interval_s)
