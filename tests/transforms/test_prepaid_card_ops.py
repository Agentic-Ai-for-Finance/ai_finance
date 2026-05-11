from datetime import date
from decimal import Decimal

from data.models.prepaid_card_operations import (
    PREPAID_CARD_ACTIVE_CARDS_TOTAL_NATURAL_PERSON_DATASET,
    PREPAID_CARD_CARDS_WITH_OPERATIONS_NATURAL_PERSON_DATASET,
    PREPAID_CARD_OPS_NATURAL_PERSON_PURCHASES_DATASET,
    PrepaidCardCountRawObservation,
    PrepaidCardOpsRawObservation,
)
from data.transforms.prepaid_card_ops import (
    to_curated_prepaid_card_counts,
    to_curated_prepaid_card_ops,
    uf_conversion_date,
)


def _raw_observation():
    return PrepaidCardOpsRawObservation(
        customer_type="Natural Person",
        operation_type="Purchases",
        dataset_code=PREPAID_CARD_OPS_NATURAL_PERSON_PURCHASES_DATASET,
        source_series_id="301",
        source_codigo="CMF_TPREP_NBANC_TX_NAT_COMP_AGIFI_TENPO_NUM_MONT",
        source_nombre="Tenpo Payments S.A. - Tarjeta Mastercard",
        institution_code="TENPO",
        institution_name="Tenpo Payments S.A. - Tarjeta Mastercard",
        period_month=date(2026, 2, 1),
        transaction_count=Decimal("2500"),
        nominal_volume_millions_clp=Decimal("1200"),
        source_payload={"transaction_count": {}, "nominal_volume_millions_clp": {}},
    )


def test_prepaid_uf_conversion_date_uses_15th_day():
    assert uf_conversion_date(date(2026, 2, 1)) == date(2026, 2, 15)


def test_to_curated_prepaid_ops_enriches_with_uf_and_active_cards():
    curated = to_curated_prepaid_card_ops(
        [_raw_observation()],
        uf_lookup=lambda _uf_date: Decimal("40000"),
        active_cards_lookup=lambda customer_type, institution_code, period_month: (
            Decimal("500")
            if customer_type == "Natural Person"
            and institution_code == "TENPO"
            and period_month == date(2026, 2, 1)
            else None
        ),
    )

    assert curated[0].customer_type == "Natural Person"
    assert curated[0].real_value_uf == Decimal("0.03")
    assert curated[0].average_ticket_uf == Decimal("12")
    assert curated[0].total_active_cards == Decimal("500")
    assert curated[0].operations_per_active_card == Decimal("5")


def test_to_curated_prepaid_counts_computes_total_activation_rate():
    curated = to_curated_prepaid_card_counts(
        [
            PrepaidCardCountRawObservation(
                customer_type="Natural Person",
                dataset_code=PREPAID_CARD_ACTIVE_CARDS_TOTAL_NATURAL_PERSON_DATASET,
                source_series_id="1",
                source_codigo="CMF_TPREP_NBANC_VIG_NAT_AGIFI_TENPO_NUM_MONT",
                source_nombre="Tenpo Payments S.A. - Tarjeta Mastercard",
                institution_code="TENPO",
                institution_name="Tenpo Payments S.A. - Tarjeta Mastercard",
                period_month=date(2026, 2, 1),
                card_count=Decimal("100"),
                source_payload={},
            ),
            PrepaidCardCountRawObservation(
                customer_type="Natural Person",
                dataset_code=PREPAID_CARD_CARDS_WITH_OPERATIONS_NATURAL_PERSON_DATASET,
                source_series_id="2",
                source_codigo="CMF_TPREP_NBANC_COPE_NAT_AGIFI_TENPO_NUM_MONT",
                source_nombre="Tenpo Payments S.A. - Tarjeta Mastercard",
                institution_code="TENPO",
                institution_name="Tenpo Payments S.A. - Tarjeta Mastercard",
                period_month=date(2026, 2, 1),
                card_count=Decimal("60"),
                source_payload={},
            ),
        ]
    )

    assert len(curated) == 1
    assert curated[0].dataset_code == "prepaid_card_counts_natural_person"
    assert curated[0].total_active_cards == Decimal("100")
    assert curated[0].total_cards_with_operations == Decimal("60")
    assert curated[0].operations_rate == Decimal("0.6")
