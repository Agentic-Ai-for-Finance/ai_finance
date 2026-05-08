import { NextRequest } from "next/server";
import { requireAppSession } from "@/lib/server/app-auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

function sanitizeCodes(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export async function GET() {
  try {
    const session = await requireAppSession();
    const supabase = getSupabaseAdminClient();
    const profilesTable = supabase.from("app_user_profiles") as any;
    const { data, error } = await profilesTable
      .select("default_institution_codes")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return jsonOk({
      defaultInstitutionCodes: (data as { default_institution_codes?: string[] | null } | null)?.default_institution_codes ?? [],
    });
  } catch (error) {
    return jsonError(401, "AUTH_REQUIRED", error instanceof Error ? error.message : "Authentication is required.");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAppSession();
    const supabase = getSupabaseAdminClient();
    const body = await request.json();
    const defaultInstitutionCodes = sanitizeCodes(body?.defaultInstitutionCodes);

    const profilesTable = supabase.from("app_user_profiles") as any;
    const { error } = await profilesTable.upsert({
      user_id: session.userId,
      email: session.email,
      role: session.role,
      default_institution_codes: defaultInstitutionCodes,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return jsonOk({
      defaultInstitutionCodes,
    });
  } catch (error) {
    return jsonError(400, "PREFERENCE_WRITE_FAILED", error instanceof Error ? error.message : "Unable to save bank preferences.");
  }
}
