import { NextRequest } from "next/server";
import { getCurrentAppSession } from "@/lib/server/app-auth";
import { recordAuditEvent } from "@/lib/server/audit";
import { jsonError, jsonOk } from "@/lib/server/http";
import { resolveMetricRequest } from "@/lib/server/metric-api";

export async function GET(request: NextRequest) {
  const session = await getCurrentAppSession();

  if (!session) {
    return jsonError(401, "AUTH_REQUIRED", "Authentication is required for protected metrics.");
  }

  try {
    const payload = await resolveMetricRequest(request.url, "protected");
    await recordAuditEvent({
      session,
      eventType: "protected_metric_read",
      route: "/api/v1/protected/metrics",
      outcome: "allowed",
    });
    return jsonOk(payload);
  } catch (error) {
    await recordAuditEvent({
      session,
      eventType: "protected_metric_read",
      route: "/api/v1/protected/metrics",
      outcome: "rejected",
      metadata: {
        reason: error instanceof Error ? error.message : "unknown",
      },
    });
    return jsonError(400, "INVALID_PROTECTED_METRIC_REQUEST", error instanceof Error ? error.message : "Invalid request.");
  }
}
