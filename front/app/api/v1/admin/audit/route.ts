import { requireAdminSession } from "@/lib/server/app-auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

export async function GET() {
  try {
    await requireAdminSession();
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("app_audit_logs")
      .select("user_id,user_role,event_type,route,outcome,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return jsonOk({
      rows: data ?? [],
    });
  } catch (error) {
    return jsonError(403, "ADMIN_REQUIRED", error instanceof Error ? error.message : "Admin access is required.");
  }
}
