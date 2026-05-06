alter table public.cmf_datasets
    add column if not exists customer_type text;

create table if not exists public.prepaid_card_ops_raw (
    customer_type text not null,
    operation_type text not null,
    dataset_code text not null,
    source_series_id text not null,
    source_codigo text not null,
    source_nombre text not null,
    institution_code text not null,
    institution_name text not null,
    period_month date not null,
    transaction_count numeric not null,
    nominal_volume_millions_clp numeric not null,
    source_payload jsonb,
    ingested_at timestamptz not null default now(),
    primary key (dataset_code, source_codigo, period_month)
);

create table if not exists public.prepaid_card_ops_curated (
    customer_type text not null,
    operation_type text not null,
    dataset_code text not null,
    institution_code text not null,
    institution_name text not null,
    period_month date not null,
    transaction_count numeric not null,
    nominal_volume_millions_clp numeric not null,
    uf_date_used date not null,
    uf_value_used numeric not null,
    real_value_uf numeric not null,
    average_ticket_uf numeric not null,
    total_active_cards numeric,
    operations_per_active_card numeric,
    source_dataset_code text not null,
    updated_at timestamptz not null default now(),
    primary key (dataset_code, institution_code, period_month)
);

create table if not exists public.prepaid_card_counts_raw (
    customer_type text not null,
    dataset_code text not null,
    source_series_id text not null,
    source_codigo text not null,
    source_nombre text not null,
    institution_code text not null,
    institution_name text not null,
    period_month date not null,
    card_count numeric not null,
    source_payload jsonb,
    ingested_at timestamptz not null default now(),
    primary key (dataset_code, source_codigo, period_month)
);

create table if not exists public.prepaid_card_counts_curated (
    customer_type text not null,
    dataset_code text not null,
    institution_code text not null,
    institution_name text not null,
    period_month date not null,
    total_active_cards numeric not null,
    total_cards_with_operations numeric not null,
    operations_rate numeric,
    updated_at timestamptz not null default now(),
    primary key (dataset_code, institution_code, period_month)
);

create index if not exists prepaid_card_ops_raw_period_idx on public.prepaid_card_ops_raw (period_month);
create index if not exists prepaid_card_ops_curated_period_idx on public.prepaid_card_ops_curated (period_month);
create index if not exists prepaid_card_counts_raw_period_idx on public.prepaid_card_counts_raw (period_month);
create index if not exists prepaid_card_counts_curated_period_idx on public.prepaid_card_counts_curated (period_month);

insert into public.cmf_datasets (
    dataset_code,
    customer_type,
    operation_type,
    measure_kind,
    source_tag,
    source_nombre,
    source_description,
    source_endpoint_base,
    refresh_frequency,
    source_unit,
    start_date,
    is_active
) values
    ('prepaid_card_ops_natural_person_purchases_transaction_count', 'Natural Person', 'Purchases', 'transaction_count', 'CMF_TPREP_NBANC_TX_NAT_COMP_AGIFI_NUM_MONT', 'Compras con tarjetas de prepago de personas, por institución (número)', 'Monthly prepaid purchase counts for natural persons by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'count', date '2009-04-01', true),
    ('prepaid_card_ops_natural_person_purchases_nominal_volume', 'Natural Person', 'Purchases', 'nominal_volume', 'CMF_TPREP_NBANC_TX_NAT_COMP_AGIFI_MM$_MONT', 'Compras con tarjetas de prepago de personas, por institución (millones de pesos)', 'Monthly prepaid purchase volume for natural persons by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'millions_clp', date '2009-04-01', true),
    ('prepaid_card_ops_natural_person_utilities_transaction_count', 'Natural Person', 'Utilities', 'transaction_count', 'CMF_TPREP_NBANC_TX_NAT_CSERV_AGIFI_NUM_MONT', 'Pago de cuentas o servicios con tarjetas de prepago de personas, por institución (número)', 'Monthly prepaid utilities transaction counts for natural persons by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'count', date '2009-04-01', true),
    ('prepaid_card_ops_natural_person_utilities_nominal_volume', 'Natural Person', 'Utilities', 'nominal_volume', 'CMF_TPREP_NBANC_TX_NAT_CSERV_AGIFI_MM$_MONT', 'Pago de cuentas o servicios con tarjetas de prepago de personas, por institución (millones de pesos)', 'Monthly prepaid utilities volume for natural persons by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'millions_clp', date '2009-04-01', true),
    ('prepaid_card_ops_natural_person_atm_withdrawals_transaction_count', 'Natural Person', 'ATM Withdrawals', 'transaction_count', 'CMF_TPREP_NBANC_TX_NAT_GIR_AGIFI_NUM_MONT', 'Retiro de efectivo con tarjetas de prepago de personas, por institución (número)', 'Monthly prepaid ATM withdrawal counts for natural persons by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'count', date '2009-04-01', true),
    ('prepaid_card_ops_natural_person_atm_withdrawals_nominal_volume', 'Natural Person', 'ATM Withdrawals', 'nominal_volume', 'CMF_TPREP_NBANC_TX_NAT_GIR_AGIFI_MM$_MONT', 'Retiro de efectivo con tarjetas de prepago de personas, por institución (millones de pesos)', 'Monthly prepaid ATM withdrawal volume for natural persons by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'millions_clp', date '2009-04-01', true),
    ('prepaid_card_ops_business_purchases_transaction_count', 'Business', 'Purchases', 'transaction_count', 'CMF_TPREP_NBANC_TX_JUR_COMP_AGIFI_NUM_MONT', 'Compras con tarjetas de prepago de empresas, por institución (número)', 'Monthly prepaid purchase counts for businesses by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'count', date '2009-04-01', true),
    ('prepaid_card_ops_business_purchases_nominal_volume', 'Business', 'Purchases', 'nominal_volume', 'CMF_TPREP_NBANC_TX_JUR_COMP_AGIFI_MM$_MONT', 'Compras con tarjetas de prepago de empresas, por institución (millones de pesos)', 'Monthly prepaid purchase volume for businesses by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'millions_clp', date '2009-04-01', true),
    ('prepaid_card_ops_business_utilities_transaction_count', 'Business', 'Utilities', 'transaction_count', 'CMF_TPREP_NBANC_TX_JUR_CSERV_AGIFI_NUM_MONT', 'Pago de cuentas o servicios con tarjetas de prepago de empresas, por institución (número)', 'Monthly prepaid utilities transaction counts for businesses by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'count', date '2009-04-01', true),
    ('prepaid_card_ops_business_utilities_nominal_volume', 'Business', 'Utilities', 'nominal_volume', 'CMF_TPREP_NBANC_TX_JUR_CSERV_AGIFI_MM$_MONT', 'Pago de cuentas o servicios con tarjetas de prepago de empresas, por institución (millones de pesos)', 'Monthly prepaid utilities volume for businesses by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'millions_clp', date '2009-04-01', true),
    ('prepaid_card_ops_business_atm_withdrawals_transaction_count', 'Business', 'ATM Withdrawals', 'transaction_count', 'CMF_TPREP_NBANC_TX_JUR_GIR_AGIFI_NUM_MONT', 'Retiro de efectivo con tarjetas de prepago de empresas, por institución (número)', 'Monthly prepaid ATM withdrawal counts for businesses by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'count', date '2009-04-01', true),
    ('prepaid_card_ops_business_atm_withdrawals_nominal_volume', 'Business', 'ATM Withdrawals', 'nominal_volume', 'CMF_TPREP_NBANC_TX_JUR_GIR_AGIFI_MM$_MONT', 'Retiro de efectivo con tarjetas de prepago de empresas, por institución (millones de pesos)', 'Monthly prepaid ATM withdrawal volume for businesses by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'millions_clp', date '2009-04-01', true),
    ('prepaid_card_active_cards_total_natural_person', 'Natural Person', 'Total Activation Rate', 'active_cards_total', 'CMF_TPREP_NBANC_VIG_NAT_AGIFI_NUM_MONT', 'Tarjetas de prepago no bancarias vigentes de personas, por institución (número)', 'Monthly active prepaid cards for natural persons by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'count', date '2009-04-01', true),
    ('prepaid_card_cards_with_operations_natural_person', 'Natural Person', 'Total Activation Rate', 'cards_with_operations', 'CMF_TPREP_NBANC_COPE_NAT_AGIFI_NUM_MONT', 'Tarjetas de prepago no bancarias con operaciones de personas, por institución (número)', 'Monthly prepaid cards with operations for natural persons by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'count', date '2009-04-01', true),
    ('prepaid_card_active_cards_total_business', 'Business', 'Total Activation Rate', 'active_cards_total', 'CMF_TPREP_NBANC_VIG_JUR_AGIFI_NUM_MONT', 'Tarjetas de prepago no bancarias vigentes de empresas, por institución (número)', 'Monthly active prepaid cards for businesses by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'count', date '2009-04-01', true),
    ('prepaid_card_cards_with_operations_business', 'Business', 'Total Activation Rate', 'cards_with_operations', 'CMF_TPREP_NBANC_COPE_JUR_AGIFI_NUM_MONT', 'Tarjetas de prepago no bancarias con operaciones de empresas, por institución (número)', 'Monthly prepaid cards with operations for businesses by issuer from CMF Cuadrosv2.', 'https://best-sbif-api.azurewebsites.net/Cuadrosv2', 'monthly', 'count', date '2009-04-01', true)
on conflict (dataset_code) do update set
    customer_type = excluded.customer_type,
    operation_type = excluded.operation_type,
    measure_kind = excluded.measure_kind,
    source_tag = excluded.source_tag,
    source_nombre = excluded.source_nombre,
    source_description = excluded.source_description,
    source_endpoint_base = excluded.source_endpoint_base,
    refresh_frequency = excluded.refresh_frequency,
    source_unit = excluded.source_unit,
    start_date = excluded.start_date,
    is_active = excluded.is_active,
    updated_at = now();

create or replace view public.prepaid_card_ops_metrics as
select
    curated.customer_type,
    curated.operation_type,
    curated.dataset_code,
    curated.institution_code,
    curated.institution_name,
    curated.period_month,
    curated.transaction_count,
    curated.nominal_volume_millions_clp,
    curated.uf_date_used,
    curated.uf_value_used,
    curated.real_value_uf,
    curated.average_ticket_uf,
    curated.total_active_cards,
    curated.operations_per_active_card,
    curated.source_dataset_code,
    curated.updated_at
from public.prepaid_card_ops_curated as curated;

create or replace view public.prepaid_card_operation_metrics as
select
    counts.customer_type,
    counts.institution_code,
    counts.institution_name,
    counts.period_month,
    counts.total_active_cards,
    counts.total_cards_with_operations,
    counts.operations_rate
from public.prepaid_card_counts_curated as counts;
