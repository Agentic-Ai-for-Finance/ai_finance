from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.parse import urlencode

from data.models.prepaid_card_operations import (
    PrepaidCardCountObservation,
    PrepaidCardCountRawObservation,
    PrepaidCardCountsConfig,
    PrepaidCardOperationConfig,
    PrepaidCardOpsMeasureObservation,
    PrepaidCardOpsRawObservation,
)


def _max_present(values):
    present_values = [value for value in values if value is not None]
    if not present_values:
        return None
    return max(present_values)


@dataclass(frozen=True)
class PrepaidCardOpsObservationBatch:
    raw_observations: list[PrepaidCardOpsRawObservation]
    latest_source_month: date | None
    earliest_source_month: date | None
    latest_transaction_count_source_month: date | None
    latest_nominal_volume_source_month: date | None


@dataclass(frozen=True)
class PrepaidCardCountsObservationBatch:
    raw_observations: list[PrepaidCardCountRawObservation]
    latest_source_month: date | None
    earliest_source_month: date | None
    latest_active_cards_total_source_month: date | None
    latest_cards_with_operations_source_month: date | None


def build_cmf_cuadros_url(*, endpoint_base: str, tag: str, fecha_fin: date, fecha_inicio: str) -> str:
    query = urlencode(
        {
            "FechaFin": fecha_fin.strftime("%Y%m%d"),
            "FechaInicio": fecha_inicio,
            "Tag": tag,
            "from": "reload",
        }
    )
    return f"{endpoint_base}?{query}"


def derive_institution_code(source_codigo: str) -> str:
    parts = source_codigo.split("_")
    if "AGIFI" in parts:
        agifi_index = parts.index("AGIFI")
        if agifi_index + 1 < len(parts):
            return parts[agifi_index + 1]
    raise ValueError(f"Cannot derive institution_code from {source_codigo}")


def parse_cmf_numeric(raw_value: str | int | float | Decimal) -> Decimal:
    if isinstance(raw_value, Decimal):
        return raw_value
    if isinstance(raw_value, int):
        return Decimal(raw_value)
    if isinstance(raw_value, float):
        return Decimal(str(raw_value))

    normalized = raw_value.strip().replace(".", "").replace(",", ".")
    try:
        return Decimal(normalized)
    except InvalidOperation as exc:
        raise ValueError(f"Unsupported CMF numeric value: {raw_value}") from exc


def normalize_period_month(raw_period: str | int | date) -> date:
    if isinstance(raw_period, date):
        return raw_period.replace(day=1)
    if isinstance(raw_period, int):
        raw_period = str(raw_period)

    for date_format in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y%m%d", "%Y%m", "%Y-%m"):
        try:
            return datetime.strptime(raw_period, date_format).date().replace(day=1)
        except ValueError:
            continue

    raise ValueError(f"Unsupported CMF period format: {raw_period}")


def parse_operation_payload(
    payload: dict[str, Any],
    *,
    customer_type: str,
    operation_type: str,
    dataset_code: str,
) -> list[PrepaidCardOpsMeasureObservation]:
    observations: list[PrepaidCardOpsMeasureObservation] = []

    for series in _get_series(payload):
        source_codigo = _first_present(series, "Codigo", "codigo", "source_codigo")
        institution_code = derive_institution_code(source_codigo)
        source_nombre = _first_present(
            series,
            "descripcionCorta",
            "DescripcionCorta",
            "Nombre",
            "nombre",
            "source_nombre",
        )
        source_series_id = str(_first_present(series, "id", "Id", "source_series_id"))

        for point in _get_observations(series):
            observations.append(
                PrepaidCardOpsMeasureObservation(
                    customer_type=customer_type,
                    operation_type=operation_type,
                    dataset_code=dataset_code,
                    source_series_id=source_series_id,
                    source_codigo=source_codigo,
                    source_nombre=source_nombre,
                    institution_code=institution_code,
                    institution_name=source_nombre,
                    period_month=normalize_period_month(
                        _first_present(point, "Fecha", "fecha", "period", "Periodo")
                    ),
                    value=parse_cmf_numeric(_first_present(point, "Valor", "valor", "value")),
                    source_payload=point,
                )
            )

    return sorted(observations, key=lambda observation: (observation.institution_code, observation.period_month))


def parse_card_count_payload(
    payload: dict[str, Any],
    *,
    customer_type: str,
    dataset_code: str,
) -> list[PrepaidCardCountObservation]:
    observations: list[PrepaidCardCountObservation] = []

    for series in _get_series(payload):
        source_codigo = _first_present(series, "Codigo", "codigo", "source_codigo")
        institution_code = derive_institution_code(source_codigo)
        source_nombre = _first_present(
            series,
            "descripcionCorta",
            "DescripcionCorta",
            "Nombre",
            "nombre",
            "source_nombre",
        )
        source_series_id = str(_first_present(series, "id", "Id", "source_series_id"))

        for point in _get_observations(series):
            observations.append(
                PrepaidCardCountObservation(
                    customer_type=customer_type,
                    dataset_code=dataset_code,
                    source_series_id=source_series_id,
                    source_codigo=source_codigo,
                    source_nombre=source_nombre,
                    institution_code=institution_code,
                    institution_name=source_nombre,
                    period_month=normalize_period_month(
                        _first_present(point, "Fecha", "fecha", "period", "Periodo")
                    ),
                    value=parse_cmf_numeric(_first_present(point, "Valor", "valor", "value")),
                    source_payload=point,
                )
            )

    return sorted(observations, key=lambda observation: (observation.institution_code, observation.period_month))


def merge_operation_measure_observations(
    *,
    customer_type: str,
    operation_type: str,
    dataset_code: str,
    transaction_count_observations: list[PrepaidCardOpsMeasureObservation],
    nominal_volume_observations: list[PrepaidCardOpsMeasureObservation],
) -> list[PrepaidCardOpsRawObservation]:
    count_by_key = {
        (observation.institution_code, observation.period_month): observation
        for observation in transaction_count_observations
    }
    volume_by_key = {
        (observation.institution_code, observation.period_month): observation
        for observation in nominal_volume_observations
    }

    raw_observations: list[PrepaidCardOpsRawObservation] = []
    for key in sorted(set(count_by_key) & set(volume_by_key)):
        count_observation = count_by_key[key]
        volume_observation = volume_by_key[key]
        raw_observations.append(
            PrepaidCardOpsRawObservation(
                customer_type=customer_type,
                operation_type=operation_type,
                dataset_code=dataset_code,
                source_series_id=volume_observation.source_series_id,
                source_codigo=volume_observation.source_codigo,
                source_nombre=volume_observation.source_nombre,
                institution_code=volume_observation.institution_code,
                institution_name=volume_observation.institution_name,
                period_month=volume_observation.period_month,
                transaction_count=count_observation.value,
                nominal_volume_millions_clp=volume_observation.value,
                source_payload={
                    "transaction_count": count_observation.source_payload,
                    "nominal_volume_millions_clp": volume_observation.source_payload,
                },
            )
        )

    return raw_observations


async def fetch_operation_measure_observations(
    client,
    *,
    endpoint_base: str,
    tag: str,
    fecha_inicio: str,
    fecha_fin: date,
    customer_type: str,
    operation_type: str,
    dataset_code: str,
) -> list[PrepaidCardOpsMeasureObservation]:
    response = await client.get(
        build_cmf_cuadros_url(
            endpoint_base=endpoint_base,
            tag=tag,
            fecha_fin=fecha_fin,
            fecha_inicio=fecha_inicio,
        ),
        timeout=30,
    )
    response.raise_for_status()
    return parse_operation_payload(
        response.json(),
        customer_type=customer_type,
        operation_type=operation_type,
        dataset_code=dataset_code,
    )


async def fetch_card_count_observations(
    client,
    *,
    endpoint_base: str,
    tag: str,
    fecha_inicio: str,
    fecha_fin: date,
    customer_type: str,
    dataset_code: str,
) -> list[PrepaidCardCountObservation]:
    response = await client.get(
        build_cmf_cuadros_url(
            endpoint_base=endpoint_base,
            tag=tag,
            fecha_fin=fecha_fin,
            fecha_inicio=fecha_inicio,
        ),
        timeout=30,
    )
    response.raise_for_status()
    return parse_card_count_payload(
        response.json(),
        customer_type=customer_type,
        dataset_code=dataset_code,
    )


async def fetch_operation_batch(client, *, config: PrepaidCardOperationConfig, fecha_fin: date) -> PrepaidCardOpsObservationBatch:
    transaction_count_observations = await fetch_operation_measure_observations(
        client,
        endpoint_base=config.source_endpoint_base,
        tag=config.transaction_count_source_tag,
        fecha_inicio=config.start_date.strftime("%Y%m%d"),
        fecha_fin=fecha_fin,
        customer_type=config.customer_type,
        operation_type=config.operation_type,
        dataset_code=config.dataset_code,
    )
    nominal_volume_observations = await fetch_operation_measure_observations(
        client,
        endpoint_base=config.source_endpoint_base,
        tag=config.nominal_volume_source_tag,
        fecha_inicio=config.start_date.strftime("%Y%m%d"),
        fecha_fin=fecha_fin,
        customer_type=config.customer_type,
        operation_type=config.operation_type,
        dataset_code=config.dataset_code,
    )

    raw_observations = merge_operation_measure_observations(
        customer_type=config.customer_type,
        operation_type=config.operation_type,
        dataset_code=config.dataset_code,
        transaction_count_observations=transaction_count_observations,
        nominal_volume_observations=nominal_volume_observations,
    )

    latest_transaction_count_source_month = max(
        (observation.period_month for observation in transaction_count_observations),
        default=None,
    )
    latest_nominal_volume_source_month = max(
        (observation.period_month for observation in nominal_volume_observations),
        default=None,
    )
    latest_source_month = _max_present(
        [
            latest_transaction_count_source_month,
            latest_nominal_volume_source_month,
        ]
    )

    return PrepaidCardOpsObservationBatch(
        raw_observations=raw_observations,
        latest_source_month=latest_source_month,
        earliest_source_month=min((observation.period_month for observation in raw_observations), default=None),
        latest_transaction_count_source_month=latest_transaction_count_source_month,
        latest_nominal_volume_source_month=latest_nominal_volume_source_month,
    )


def to_card_count_raw_observations(observations: list[PrepaidCardCountObservation]) -> list[PrepaidCardCountRawObservation]:
    return [
        PrepaidCardCountRawObservation(
            customer_type=observation.customer_type,
            dataset_code=observation.dataset_code,
            source_series_id=observation.source_series_id,
            source_codigo=observation.source_codigo,
            source_nombre=observation.source_nombre,
            institution_code=observation.institution_code,
            institution_name=observation.institution_name,
            period_month=observation.period_month,
            card_count=observation.value,
            source_payload=observation.source_payload,
        )
        for observation in observations
    ]


async def fetch_card_counts_batch(client, *, config: PrepaidCardCountsConfig, fecha_fin: date) -> PrepaidCardCountsObservationBatch:
    active_cards_total = await fetch_card_count_observations(
        client,
        endpoint_base=config.source_endpoint_base,
        tag=config.active_cards_total_source_tag,
        fecha_inicio=config.start_date.strftime("%Y%m%d"),
        fecha_fin=fecha_fin,
        customer_type=config.customer_type,
        dataset_code=config.active_cards_total_dataset_code,
    )
    cards_with_operations = await fetch_card_count_observations(
        client,
        endpoint_base=config.source_endpoint_base,
        tag=config.cards_with_operations_source_tag,
        fecha_inicio=config.start_date.strftime("%Y%m%d"),
        fecha_fin=fecha_fin,
        customer_type=config.customer_type,
        dataset_code=config.cards_with_operations_dataset_code,
    )

    raw_observations = [
        *to_card_count_raw_observations(active_cards_total),
        *to_card_count_raw_observations(cards_with_operations),
    ]

    return PrepaidCardCountsObservationBatch(
        raw_observations=sorted(raw_observations, key=lambda observation: (observation.dataset_code, observation.institution_code, observation.period_month)),
        latest_source_month=max((observation.period_month for observation in raw_observations), default=None),
        earliest_source_month=min((observation.period_month for observation in raw_observations), default=None),
        latest_active_cards_total_source_month=max((observation.period_month for observation in active_cards_total), default=None),
        latest_cards_with_operations_source_month=max((observation.period_month for observation in cards_with_operations), default=None),
    )


def _get_series(payload: dict[str, Any]) -> list[dict[str, Any]]:
    series = payload.get("Series") or payload.get("series") or payload.get("data") or []
    if not isinstance(series, list):
        raise ValueError("CMF payload series is not a list")
    return series


def _get_observations(series: dict[str, Any]) -> list[dict[str, Any]]:
    observations = (
        series.get("Obs")
        or series.get("obs")
        or series.get("observations")
        or series.get("data")
        or []
    )
    if not isinstance(observations, list):
        raise ValueError("CMF payload observations are not a list")
    return observations


def _first_present(payload: dict[str, Any], *keys: str):
    for key in keys:
        value = payload.get(key)
        if value not in (None, ""):
            return value
    raise KeyError(f"Missing any of keys {keys} in payload: {payload}")
