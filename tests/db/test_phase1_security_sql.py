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
    assert "grant select, insert, update on public.app_user_profiles to authenticated" in sql
