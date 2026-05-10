revoke all on table public.app_user_profiles from anon;
revoke all on table public.app_audit_logs from anon;

revoke all on table public.bank_credit_card_ops_raw from anon, authenticated;
revoke all on table public.bank_credit_card_ops_curated from anon, authenticated;
revoke all on table public.bank_credit_card_counts_raw from anon, authenticated;
revoke all on table public.bank_credit_card_counts_curated from anon, authenticated;
revoke all on table public.bank_debit_card_ops_raw from anon, authenticated;
revoke all on table public.bank_debit_card_ops_curated from anon, authenticated;
revoke all on table public.bank_debit_card_counts_raw from anon, authenticated;
revoke all on table public.bank_debit_card_counts_curated from anon, authenticated;
revoke all on table public.prepaid_card_ops_raw from anon, authenticated;
revoke all on table public.prepaid_card_ops_curated from anon, authenticated;
revoke all on table public.prepaid_card_counts_raw from anon, authenticated;
revoke all on table public.prepaid_card_counts_curated from anon, authenticated;
revoke all on table public.checking_accounts_raw from anon, authenticated;
revoke all on table public.checking_accounts_curated from anon, authenticated;
revoke all on table public.uf_values from anon, authenticated;

revoke all on table public.bank_credit_card_ops_metrics from anon, authenticated;
revoke all on table public.bank_credit_card_operations_rate_metrics from anon, authenticated;
revoke all on table public.bank_debit_card_ops_metrics from anon, authenticated;
revoke all on table public.bank_debit_card_operation_metrics from anon, authenticated;
revoke all on table public.prepaid_card_ops_metrics from anon, authenticated;
revoke all on table public.prepaid_card_operation_metrics from anon, authenticated;
revoke all on table public.checking_accounts_metrics from anon, authenticated;
