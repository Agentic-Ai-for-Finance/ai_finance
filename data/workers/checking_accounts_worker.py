import asyncio
import logging
import os
from dataclasses import dataclass
from datetime import date

import httpx
from dotenv import load_dotenv
from supabase import create_client

from data.loaders.bank_credit_card_ops_sync_state_loader import (
    get_latest_state_source_month,
    record_sync_attempt,
    record_sync_failure,
    record_sync_success,
)
from data.loaders.checking_accounts_loader import (
    earliest_curated_checking_accounts_month,
    get_uf_value_for_date,
    upsert_checking_accounts_curated,
    upsert_checking_accounts_raw,
)
from data.models.checking_accounts import (
    CHECKING_ACCOUNTS_DATASET_BUSINESS_WITH_INTEREST,
    CHECKING_ACCOUNTS_DATASET_BUSINESS_WITHOUT_INTEREST,
    CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITH_INTEREST,
    CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST,
    CHECKING_ACCOUNTS_OPERATION_BUSINESS_WITH_INTEREST,
    CHECKING_ACCOUNTS_OPERATION_BUSINESS_WITHOUT_INTEREST,
    CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITH_INTEREST,
    CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITHOUT_INTEREST,
    CMF_DATASETS_TABLE,
    CMF_MEASURE_KIND_ACCOUNT_COUNT,
    CMF_MEASURE_KIND_NOMINAL_BALANCE,
    CheckingAccountsConfig,
    CheckingAccountsEndpointConfig,
)
from data.sources.checking_accounts import fetch_checking_accounts_batch
from data.transforms.checking_accounts import to_curated_checking_accounts

DAILY_INTERVAL_S = 24 * 60 * 60
DEFAULT_CMF_ENDPOINT_BASE = "https://best-sbif-api.azurewebsites.net/Cuadrosv2"

log = logging.getLogger("checking-accounts-worker")


@dataclass(frozen=True)
class CheckingAccountsWorkerConfig:
    supabase_url: str
    supabase_service_role_key: str
    endpoint_base: str = DEFAULT_CMF_ENDPOINT_BASE
    sync_interval_s: int = DAILY_INTERVAL_S


def load_config() -> CheckingAccountsWorkerConfig:
    load_dotenv()
    return CheckingAccountsWorkerConfig(
        supabase_url=os.environ["SUPABASE_URL"],
        supabase_service_role_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        endpoint_base=os.environ.get("BASE_ENDPOINT_CMF_CARDS", DEFAULT_CMF_ENDPOINT_BASE),
    )


def operation_dataset_code(operation_type: str) -> str:
    if operation_type == CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITHOUT_INTEREST:
        return CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITHOUT_INTEREST
    if operation_type == CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITH_INTEREST:
        return CHECKING_ACCOUNTS_DATASET_NATURAL_PERSON_WITH_INTEREST
    if operation_type == CHECKING_ACCOUNTS_OPERATION_BUSINESS_WITHOUT_INTEREST:
        return CHECKING_ACCOUNTS_DATASET_BUSINESS_WITHOUT_INTEREST
    if operation_type == CHECKING_ACCOUNTS_OPERATION_BUSINESS_WITH_INTEREST:
        return CHECKING_ACCOUNTS_DATASET_BUSINESS_WITH_INTEREST
    raise ValueError(f"Unsupported operation type: {operation_type}")


def load_active_checking_accounts_configs(sb) -> list[CheckingAccountsConfig]:
    response = (
        sb.table(CMF_DATASETS_TABLE)
        .select(
            "operation_type,dataset_code,measure_kind,source_tag,source_nombre,"
            "source_description,source_endpoint_base,refresh_frequency,start_date,is_active"
        )
        .eq("is_active", True)
        .execute()
    )
    endpoints_by_operation: dict[str, dict[str, CheckingAccountsEndpointConfig]] = {}
    supported_operations = {
        CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITHOUT_INTEREST,
        CHECKING_ACCOUNTS_OPERATION_NATURAL_PERSON_WITH_INTEREST,
        CHECKING_ACCOUNTS_OPERATION_BUSINESS_WITHOUT_INTEREST,
        CHECKING_ACCOUNTS_OPERATION_BUSINESS_WITH_INTEREST,
    }
    for row in response.data or []:
        if not row.get("operation_type") or not row.get("measure_kind") or not row.get("source_tag"):
            continue
        if row["operation_type"] not in supported_operations:
            continue
        endpoint = CheckingAccountsEndpointConfig.from_row(row)
        endpoints_by_operation.setdefault(endpoint.operation_type, {})[endpoint.measure_kind] = endpoint

    operations: list[CheckingAccountsConfig] = []
    for operation_type, endpoint_group in endpoints_by_operation.items():
        account_count_endpoint = endpoint_group.get(CMF_MEASURE_KIND_ACCOUNT_COUNT)
        nominal_balance_endpoint = endpoint_group.get(CMF_MEASURE_KIND_NOMINAL_BALANCE)
        if account_count_endpoint is None or nominal_balance_endpoint is None:
            continue

        operations.append(
            CheckingAccountsConfig(
                operation_type=operation_type,
                dataset_code=operation_dataset_code(operation_type),
                account_count_dataset_code=account_count_endpoint.dataset_code,
                nominal_balance_dataset_code=nominal_balance_endpoint.dataset_code,
                account_count_source_tag=account_count_endpoint.source_tag,
                nominal_balance_source_tag=nominal_balance_endpoint.source_tag,
                source_nombre=account_count_endpoint.source_nombre,
                source_description=account_count_endpoint.source_description,
                source_endpoint_base=account_count_endpoint.source_endpoint_base,
                refresh_frequency=account_count_endpoint.refresh_frequency,
                start_date=min(account_count_endpoint.start_date, nominal_balance_endpoint.start_date),
                account_count_start_date=account_count_endpoint.start_date,
                nominal_balance_start_date=nominal_balance_endpoint.start_date,
            )
        )

    return sorted(operations, key=lambda operation: operation.dataset_code)


async def sync_checking_accounts_once(
    client: httpx.AsyncClient,
    sb,
    *,
    config: CheckingAccountsConfig,
    run_date: date,
) -> int:
    record_sync_attempt(sb, config.account_count_dataset_code)
    record_sync_attempt(sb, config.nominal_balance_dataset_code)
    try:
        batch = await fetch_checking_accounts_batch(client, config=config, fecha_fin=run_date)
        if batch.latest_source_month is None:
            log.info("Skipping %s: source returned no rows.", config.dataset_code)
            return 0

        latest_count_state_month = get_latest_state_source_month(sb, config.account_count_dataset_code)
        latest_balance_state_month = get_latest_state_source_month(sb, config.nominal_balance_dataset_code)
        earliest_curated_month = earliest_curated_checking_accounts_month(sb, dataset_code=config.dataset_code)

        account_count_unchanged = (
            batch.latest_account_count_source_month is None
            or (
                latest_count_state_month is not None
                and batch.latest_account_count_source_month <= latest_count_state_month
            )
        )
        nominal_balance_unchanged = (
            batch.latest_nominal_balance_source_month is None
            or (
                latest_balance_state_month is not None
                and batch.latest_nominal_balance_source_month <= latest_balance_state_month
            )
        )
        history_is_complete = (
            batch.earliest_source_month is None
            or (
                earliest_curated_month is not None
                and earliest_curated_month <= batch.earliest_source_month
            )
        )
        if account_count_unchanged and nominal_balance_unchanged and history_is_complete:
            log.info("Skipping %s: latest source month is unchanged.", config.dataset_code)
            return 0

        curated_observations = to_curated_checking_accounts(
            batch.raw_observations,
            uf_lookup=lambda uf_date: get_uf_value_for_date(sb, uf_date),
        )
        upsert_checking_accounts_raw(sb, batch.raw_observations)
        upsert_checking_accounts_curated(sb, curated_observations)
    except Exception as exc:
        record_sync_failure(sb, dataset_code=config.account_count_dataset_code, error=exc)
        record_sync_failure(sb, dataset_code=config.nominal_balance_dataset_code, error=exc)
        raise

    record_sync_success(
        sb,
        dataset_code=config.account_count_dataset_code,
        latest_source_month=batch.latest_account_count_source_month or batch.latest_source_month,
        latest_curated_month=batch.latest_source_month,
    )
    record_sync_success(
        sb,
        dataset_code=config.nominal_balance_dataset_code,
        latest_source_month=batch.latest_nominal_balance_source_month or batch.latest_source_month,
        latest_curated_month=batch.latest_source_month,
    )
    return len(batch.raw_observations)


async def sync_all_checking_accounts_once(
    client: httpx.AsyncClient,
    sb,
    *,
    config: CheckingAccountsWorkerConfig,
    run_date: date,
    operations: list[CheckingAccountsConfig] | None = None,
) -> dict[str, int]:
    results: dict[str, int] = {}
    for operation in operations or load_active_checking_accounts_configs(sb):
        try:
            results[operation.dataset_code] = await sync_checking_accounts_once(
                client,
                sb,
                config=operation,
                run_date=run_date,
            )
        except Exception as exc:
            log.warning(
                "Checking accounts operation %s failed: %s: %s",
                operation.dataset_code,
                type(exc).__name__,
                exc,
            )
            results[operation.dataset_code] = 0
    return results


async def run_worker(config: CheckingAccountsWorkerConfig | None = None) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    worker_config = config or load_config()
    sb = create_client(worker_config.supabase_url, worker_config.supabase_service_role_key)

    async with httpx.AsyncClient() as client:
        while True:
            try:
                await sync_all_checking_accounts_once(
                    client,
                    sb,
                    config=worker_config,
                    run_date=date.today(),
                )
            except Exception as exc:
                log.warning("Checking accounts sync failed: %s: %s", type(exc).__name__, exc)

            await asyncio.sleep(worker_config.sync_interval_s)
