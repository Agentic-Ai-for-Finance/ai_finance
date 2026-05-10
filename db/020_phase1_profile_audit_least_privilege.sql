revoke all on table public.app_user_profiles from authenticated;
grant select, insert, update on table public.app_user_profiles to authenticated;

revoke all on table public.app_audit_logs from authenticated;
grant select on table public.app_audit_logs to authenticated;
