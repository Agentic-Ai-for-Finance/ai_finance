from datetime import date

from data.models.prepaid_card_operations import (
    PREPAID_CARD_COUNTS_BUSINESS_DATASET,
    PREPAID_CARD_COUNTS_NATURAL_PERSON_DATASET,
    PREPAID_CARD_OPS_BUSINESS_PURCHASES_DATASET,
    PREPAID_CARD_OPS_NATURAL_PERSON_UTILITIES_DATASET,
)
from data.workers.prepaid_card_ops_worker import (
    load_active_card_counts_configs,
    load_active_operation_configs,
    operation_dataset_code,
)


class _Response:
    def __init__(self, data):
        self.data = data


class _Table:
    def __init__(self, rows):
        self.rows = rows

    def select(self, *_args):
        return self

    def eq(self, column, value):
        if column == "is_active":
            self.rows = [row for row in self.rows if row.get(column) == value]
        elif column == "operation_type":
            self.rows = [row for row in self.rows if row.get(column) == value]
        return self

    @property
    def not_(self):
        return self

    def is_(self, *_args):
        return self

    def execute(self):
        return _Response(self.rows)


class _Supabase:
    def __init__(self, rows):
        self.rows = rows

    def table(self, _name):
        return _Table(list(self.rows))


def test_operation_dataset_code_maps_world_and_operation():
    assert operation_dataset_code("Natural Person", "Utilities") == PREPAID_CARD_OPS_NATURAL_PERSON_UTILITIES_DATASET
    assert operation_dataset_code("Business", "Purchases") == PREPAID_CARD_OPS_BUSINESS_PURCHASES_DATASET


def test_load_active_configs_group_by_customer_type_and_measure_kind():
    rows = [
        {
            "customer_type": "Natural Person",
            "operation_type": "Utilities",
            "dataset_code": "prepaid_card_ops_natural_person_utilities_transaction_count",
            "measure_kind": "transaction_count",
            "source_tag": "count-tag",
            "source_nombre": "Utilities",
            "source_description": "Utilities count",
            "source_endpoint_base": "https://cmf.example",
            "refresh_frequency": "monthly",
            "start_date": date(2009, 4, 1).isoformat(),
            "is_active": True,
        },
        {
            "customer_type": "Natural Person",
            "operation_type": "Utilities",
            "dataset_code": "prepaid_card_ops_natural_person_utilities_nominal_volume",
            "measure_kind": "nominal_volume",
            "source_tag": "volume-tag",
            "source_nombre": "Utilities",
            "source_description": "Utilities volume",
            "source_endpoint_base": "https://cmf.example",
            "refresh_frequency": "monthly",
            "start_date": date(2009, 4, 1).isoformat(),
            "is_active": True,
        },
        {
            "customer_type": "Natural Person",
            "operation_type": "Total Activation Rate",
            "dataset_code": "prepaid_card_active_cards_total_natural_person",
            "measure_kind": "active_cards_total",
            "source_tag": "vig-tag",
            "source_nombre": "Active cards",
            "source_description": "Active cards",
            "source_endpoint_base": "https://cmf.example",
            "refresh_frequency": "monthly",
            "start_date": date(2009, 4, 1).isoformat(),
            "is_active": True,
        },
        {
            "customer_type": "Natural Person",
            "operation_type": "Total Activation Rate",
            "dataset_code": "prepaid_card_cards_with_operations_natural_person",
            "measure_kind": "cards_with_operations",
            "source_tag": "cope-tag",
            "source_nombre": "Cards with operations",
            "source_description": "Cards with operations",
            "source_endpoint_base": "https://cmf.example",
            "refresh_frequency": "monthly",
            "start_date": date(2009, 4, 1).isoformat(),
            "is_active": True,
        },
        {
            "customer_type": "Business",
            "operation_type": "Total Activation Rate",
            "dataset_code": "prepaid_card_active_cards_total_business",
            "measure_kind": "active_cards_total",
            "source_tag": "vig-tag-business",
            "source_nombre": "Active cards",
            "source_description": "Active cards",
            "source_endpoint_base": "https://cmf.example",
            "refresh_frequency": "monthly",
            "start_date": date(2009, 4, 1).isoformat(),
            "is_active": True,
        },
        {
            "customer_type": "Business",
            "operation_type": "Total Activation Rate",
            "dataset_code": "prepaid_card_cards_with_operations_business",
            "measure_kind": "cards_with_operations",
            "source_tag": "cope-tag-business",
            "source_nombre": "Cards with operations",
            "source_description": "Cards with operations",
            "source_endpoint_base": "https://cmf.example",
            "refresh_frequency": "monthly",
            "start_date": date(2009, 4, 1).isoformat(),
            "is_active": True,
        },
    ]
    sb = _Supabase(rows)

    operations = load_active_operation_configs(sb)
    counts_configs = load_active_card_counts_configs(sb)

    assert len(operations) == 1
    assert operations[0].dataset_code == PREPAID_CARD_OPS_NATURAL_PERSON_UTILITIES_DATASET
    assert sorted(config.dataset_code for config in counts_configs) == [
        PREPAID_CARD_COUNTS_BUSINESS_DATASET,
        PREPAID_CARD_COUNTS_NATURAL_PERSON_DATASET,
    ]
