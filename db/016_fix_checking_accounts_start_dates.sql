update public.cmf_datasets
set start_date = date '2009-04-01',
    updated_at = now()
where dataset_code in (
    'checking_accounts_natural_person_without_interest_account_count',
    'checking_accounts_natural_person_without_interest_nominal_balance',
    'checking_accounts_natural_person_with_interest_account_count',
    'checking_accounts_natural_person_with_interest_nominal_balance',
    'checking_accounts_business_without_interest_account_count',
    'checking_accounts_business_without_interest_nominal_balance',
    'checking_accounts_business_with_interest_account_count',
    'checking_accounts_business_with_interest_nominal_balance'
);
