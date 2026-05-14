from pathlib import Path


def test_phase1_security_sql_adds_user_profiles_audit_logs_and_rls():
    sql = Path("db/018_phase1_security_foundation.sql").read_text()

    assert "create table if not exists public.app_user_profiles" in sql
    assert "create table if not exists public.app_audit_logs" in sql
    assert "default_institution_codes text[]" in sql
    assert "alter table public.app_user_profiles enable row level security" in sql
    assert "alter table public.app_audit_logs enable row level security" in sql
    assert 'create policy "app_user_profiles_select_own"' in sql
    assert 'create policy "app_user_profiles_update_own"' in sql
    assert "public.requesting_user_id()" in sql
    assert (
        "grant select, insert, update on public.app_user_profiles to authenticated"
        in sql
    )


def test_phase1_grant_hardening_sql_revokes_direct_dashboard_reads():
    sql = Path("db/019_phase1_grant_hardening.sql").read_text()

    assert "revoke all on table public.app_user_profiles from anon;" in sql
    assert "revoke all on table public.app_audit_logs from anon;" in sql
    assert (
        "revoke all on table public.bank_credit_card_ops_metrics from anon, authenticated;"
        in sql
    )
    assert (
        "revoke all on table public.bank_debit_card_ops_metrics from anon, authenticated;"
        in sql
    )
    assert (
        "revoke all on table public.prepaid_card_ops_metrics from anon, authenticated;"
        in sql
    )
    assert (
        "revoke all on table public.checking_accounts_metrics from anon, authenticated;"
        in sql
    )


def test_phase1_profile_audit_least_privilege_sql():
    sql = Path("db/020_phase1_profile_audit_least_privilege.sql").read_text()

    assert "revoke all on table public.app_user_profiles from authenticated;" in sql
    assert (
        "grant select, insert, update on table public.app_user_profiles to authenticated;"
        in sql
    )
    assert "revoke all on table public.app_audit_logs from authenticated;" in sql
    assert "grant select on table public.app_audit_logs to authenticated;" in sql
