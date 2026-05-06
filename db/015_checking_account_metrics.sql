create table if not exists public.checking_accounts_raw (
    account_type text not null,
    dataset_code text not null,
    source_series_id text not null,
    source_codigo text not null,
    source_nombre text not null,
    institution_code text not null,
    institution_name text not null,
    period_month date not null,
    account_count numeric not null,
    nominal_balance_millions_clp numeric not null,
    source_payload jsonb,
    ingested_at timestamptz not null default now(),
    primary key (dataset_code, source_codigo, period_month)
);

create table if not exists public.checking_accounts_curated (
    account_type text not null,
    dataset_code text not null,
    institution_code text not null,
    institution_name text not null,
    period_month date not null,
    account_count numeric not null,
    nominal_balance_millions_clp numeric not null,
    uf_date_used date not null,
    uf_value_used numeric not null,
    real_balance_uf numeric not null,
    average_balance_uf numeric not null,
    source_dataset_code text not null,
    updated_at timestamptz not null default now(),
    primary key (dataset_code, institution_code, period_month)
);

create index if not exists checking_accounts_raw_period_idx
    on public.checking_accounts_raw (period_month);

create index if not exists checking_accounts_curated_period_idx
    on public.checking_accounts_curated (period_month);

comment on table public.checking_accounts_raw
    is 'Raw checking-account observations in millions of CLP.';

comment on table public.checking_accounts_curated
    is 'Curated checking-account observations in millions of CLP with UF enrichment.';

insert into public.cmf_datasets (
    dataset_code,
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
    (
        'checking_accounts_natural_person_without_interest_account_count',
        'Natural Person Without Interest',
        'account_count',
        'SBIF_CTACTE_NAT_AGIFI_NUM',
        'Cuentas corrientes sin pago de intereses de personas naturales',
        'Monthly checking account counts without interest for natural persons by institution from CMF Cuadrosv2.',
        'https://best-sbif-api.azurewebsites.net/Cuadrosv2',
        'monthly',
        'count',
        date '2021-12-01',
        true
    ),
    (
        'checking_accounts_natural_person_without_interest_nominal_balance',
        'Natural Person Without Interest',
        'nominal_balance',
        'SBIF_CTACTE_NAT_AGIFI_MM$',
        'Cuentas corrientes sin pago de intereses de personas naturales',
        'Monthly checking account nominal balances without interest for natural persons by institution from CMF Cuadrosv2.',
        'https://best-sbif-api.azurewebsites.net/Cuadrosv2',
        'monthly',
        'millions_clp',
        date '2025-02-01',
        true
    ),
    (
        'checking_accounts_natural_person_with_interest_account_count',
        'Natural Person With Interest',
        'account_count',
        'SBIF_CTACTE_CINT_NAT_AGIFI_NUM',
        'Cuentas corrientes con pago de intereses de personas naturales',
        'Monthly checking account counts with interest for natural persons by institution from CMF Cuadrosv2.',
        'https://best-sbif-api.azurewebsites.net/Cuadrosv2',
        'monthly',
        'count',
        date '2025-02-01',
        true
    ),
    (
        'checking_accounts_natural_person_with_interest_nominal_balance',
        'Natural Person With Interest',
        'nominal_balance',
        'SBIF_CTACTE_CINT_NAT_AGIFI_MM$',
        'Cuentas corrientes con pago de intereses de personas naturales',
        'Monthly checking account nominal balances with interest for natural persons by institution from CMF Cuadrosv2.',
        'https://best-sbif-api.azurewebsites.net/Cuadrosv2',
        'monthly',
        'millions_clp',
        date '2025-02-01',
        true
    ),
    (
        'checking_accounts_business_without_interest_account_count',
        'Business Without Interest',
        'account_count',
        'SBIF_CTACTE_JUR_AGIFI_NUM',
        'Cuentas corrientes sin pago de intereses de personas juridicas',
        'Monthly checking account counts without interest for business customers by institution from CMF Cuadrosv2.',
        'https://best-sbif-api.azurewebsites.net/Cuadrosv2',
        'monthly',
        'count',
        date '2025-02-01',
        true
    ),
    (
        'checking_accounts_business_without_interest_nominal_balance',
        'Business Without Interest',
        'nominal_balance',
        'SBIF_CTACTE_JUR_AGIFI_MM$',
        'Cuentas corrientes sin pago de intereses de personas juridicas',
        'Monthly checking account nominal balances without interest for business customers by institution from CMF Cuadrosv2.',
        'https://best-sbif-api.azurewebsites.net/Cuadrosv2',
        'monthly',
        'millions_clp',
        date '2025-02-01',
        true
    ),
    (
        'checking_accounts_business_with_interest_account_count',
        'Business With Interest',
        'account_count',
        'SBIF_CTACTE_CINT_JUR_AGIFI_NUM',
        'Cuentas corrientes con pago de intereses de personas juridicas',
        'Monthly checking account counts with interest for business customers by institution from CMF Cuadrosv2.',
        'https://best-sbif-api.azurewebsites.net/Cuadrosv2',
        'monthly',
        'count',
        date '2025-02-01',
        true
    ),
    (
        'checking_accounts_business_with_interest_nominal_balance',
        'Business With Interest',
        'nominal_balance',
        'SBIF_CTACTE_CINT_JUR_AGIFI_MM$',
        'Cuentas corrientes con pago de intereses de personas juridicas',
        'Monthly checking account nominal balances with interest for business customers by institution from CMF Cuadrosv2.',
        'https://best-sbif-api.azurewebsites.net/Cuadrosv2',
        'monthly',
        'millions_clp',
        date '2025-02-01',
        true
    )
on conflict (dataset_code) do update set
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

create or replace view public.checking_accounts_metrics as
select
    curated.account_type,
    curated.dataset_code,
    curated.institution_code,
    curated.institution_name,
    curated.period_month,
    curated.account_count,
    curated.nominal_balance_millions_clp,
    curated.uf_date_used,
    curated.uf_value_used,
    curated.real_balance_uf,
    curated.average_balance_uf,
    curated.source_dataset_code,
    curated.updated_at
from public.checking_accounts_curated as curated;
