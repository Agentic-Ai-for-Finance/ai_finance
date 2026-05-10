import { requireAdminSession } from "@/lib/server/app-auth";
import { recordAuditEvent } from "@/lib/server/audit";
import { jsonError, jsonOk } from "@/lib/server/http";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

export async function GET() {
  let session: Awaited<ReturnType<typeof requireAdminSession>> | null = null;
  try {
    session = await requireAdminSession();
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("app_audit_logs")
      .select("user_id,user_role,event_type,route,outcome,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    await recordAuditEvent({
      session,
      eventType: "admin_audit_read",
      route: "/api/v1/admin/audit",
      outcome: "allowed",
    });

    return jsonOk({
      rows: data ?? [],
    });
  } catch (error) {
    await recordAuditEvent({
      session,
      eventType: "admin_audit_read",
      route: "/api/v1/admin/audit",
      outcome: "rejected",
      metadata: {
        reason: error instanceof Error ? error.message : "unknown",
      },
    });
    return jsonError(403, "ADMIN_REQUIRED", error instanceof Error ? error.message : "Admin access is required.");
  }
}
