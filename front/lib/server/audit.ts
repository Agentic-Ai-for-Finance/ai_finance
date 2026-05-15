import type { AppSession } from "@/lib/server/app-auth";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type AuditEventInput = {
  session?: AppSession | null;
  eventType: string;
  route: string;
  outcome: string;
  metadata?: Record<string, unknown>;
};

export async function recordAuditEvent({
  session,
  eventType,
  route,
  outcome,
  metadata = {},
}: AuditEventInput) {
  try {
    const supabase = getSupabaseAdminClient();
    const auditLogsTable = supabase.from("app_audit_logs") as any;
    const { error } = await auditLogsTable.insert({
      user_id: session?.userId ?? null,
      user_role: session?.role ?? null,
      event_type: eventType,
      route,
      outcome,
      metadata,
    });

    if (error) {
      console.error("Failed to record audit event", {
        route,
        eventType,
        outcome,
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Failed to record audit event", {
      route,
      eventType,
      outcome,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
