from datetime import date
from decimal import Decimal

from data.models.prepaid_card_operations import (
    PREPAID_CARD_ACTIVE_CARDS_TOTAL_NATURAL_PERSON_DATASET,
    PREPAID_CARD_OPS_NATURAL_PERSON_PURCHASES_DATASET,
)
from data.sources.prepaid_card_operations import (
    build_cmf_cuadros_url,
    derive_institution_code,
    merge_operation_measure_observations,
    normalize_period_month,
    parse_card_count_payload,
    parse_cmf_numeric,
    parse_operation_payload,
    to_card_count_raw_observations,
)


def _payload(*, series_id: int, codigo: str, nombre: str, values: list[tuple[str, str]]):
    return {
        "series": [
            {
                "id": series_id,
                "Codigo": codigo,
                "Nombre": nombre,
                "data": [{"Fecha": fecha, "Valor": valor} for fecha, valor in values],
            }
        ]
    }


def test_build_cmf_cuadros_url_for_prepaid_endpoint():
    url = build_cmf_cuadros_url(
        endpoint_base="https://best-sbif-api.azurewebsites.net/Cuadrosv2",
        tag="CMF_TPREP_NBANC_TX_NAT_COMP_AGIFI_NUM_MONT",
        fecha_fin=date(2026, 2, 1),
        fecha_inicio="20090401",
    )

    assert url == (
        "https://best-sbif-api.azurewebsites.net/Cuadrosv2?"
        "FechaFin=20260201&FechaInicio=20090401&"
        "Tag=CMF_TPREP_NBANC_TX_NAT_COMP_AGIFI_NUM_MONT&from=reload"
    )


def test_prepaid_source_helpers_normalize_common_shapes():
    assert derive_institution_code("CMF_TPREP_NBANC_TX_NAT_COMP_AGIFI_TENPO_NUM_MONT") == "TENPO"
    assert parse_cmf_numeric("1.234,50") == Decimal("1234.50")
    assert normalize_period_month("202602") == date(2026, 2, 1)


def test_parse_operation_payload_builds_prepaid_observations():
    payload = _payload(
        series_id=1,
        codigo="CMF_TPREP_NBANC_TX_NAT_COMP_AGIFI_TENPO_NUM_MONT",
        nombre="Tenpo Payments S.A. - Tarjeta Mastercard",
        values=[("2026-02-01", "2.500")],
    )

    observations = parse_operation_payload(
        payload,
        customer_type="Natural Person",
        operation_type="Purchases",
        dataset_code=PREPAID_CARD_OPS_NATURAL_PERSON_PURCHASES_DATASET,
    )

    assert observations[0].customer_type == "Natural Person"
    assert observations[0].operation_type == "Purchases"
    assert observations[0].institution_code == "TENPO"
    assert observations[0].value == Decimal("2500")


def test_parse_card_count_payload_and_merge_rows():
    counts = parse_card_count_payload(
        _payload(
            series_id=2,
            codigo="CMF_TPREP_NBANC_VIG_NAT_AGIFI_TENPO_NUM_MONT",
            nombre="Tenpo Payments S.A. - Tarjeta Mastercard",
            values=[("2026-02-01", "100")],
        ),
        customer_type="Natural Person",
        dataset_code=PREPAID_CARD_ACTIVE_CARDS_TOTAL_NATURAL_PERSON_DATASET,
    )

    raw_counts = to_card_count_raw_observations(counts)
    operation_rows = merge_operation_measure_observations(
        customer_type="Natural Person",
        operation_type="Purchases",
        dataset_code=PREPAID_CARD_OPS_NATURAL_PERSON_PURCHASES_DATASET,
        transaction_count_observations=parse_operation_payload(
            _payload(
                series_id=3,
                codigo="CMF_TPREP_NBANC_TX_NAT_COMP_AGIFI_TENPO_NUM_MONT",
                nombre="Tenpo Payments S.A. - Tarjeta Mastercard",
                values=[("2026-02-01", "2.500")],
            ),
            customer_type="Natural Person",
            operation_type="Purchases",
            dataset_code=PREPAID_CARD_OPS_NATURAL_PERSON_PURCHASES_DATASET,
        ),
        nominal_volume_observations=parse_operation_payload(
            _payload(
                series_id=4,
                codigo="CMF_TPREP_NBANC_TX_NAT_COMP_AGIFI_TENPO_MM$_MONT",
                nombre="Tenpo Payments S.A. - Tarjeta Mastercard",
                values=[("2026-02-01", "1.200")],
            ),
            customer_type="Natural Person",
            operation_type="Purchases",
            dataset_code=PREPAID_CARD_OPS_NATURAL_PERSON_PURCHASES_DATASET,
        ),
    )

    assert raw_counts[0].card_count == Decimal("100")
    assert operation_rows[0].transaction_count == Decimal("2500")
    assert operation_rows[0].nominal_volume_millions_clp == Decimal("1200")
