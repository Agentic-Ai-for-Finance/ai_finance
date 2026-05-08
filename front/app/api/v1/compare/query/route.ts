import { NextRequest } from "next/server";
import { getCurrentAppSession } from "@/lib/server/app-auth";
import { recordAuditEvent } from "@/lib/server/audit";
import { jsonError, jsonOk } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";

const COMPARE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const session = await getCurrentAppSession();

  if (!session) {
    return jsonError(401, "AUTH_REQUIRED", "Authentication is required for compare queries.");
  }

  const limit = session.role === "admin" ? 240 : 120;
  const rateLimit = checkRateLimit(`compare:${session.userId}`, limit, COMPARE_WINDOW_MS);
  if (!rateLimit.ok) {
    await recordAuditEvent({
      session,
      eventType: "compare_query",
      route: "/api/v1/compare/query",
      outcome: "rate_limited",
    });
    return jsonError(429, "RATE_LIMITED", "Compare quota exceeded.", { limit, resetAt: rateLimit.resetAt });
  }

  const body = await request.json().catch(() => null);
  const months = Number(body?.dateRangeMonths ?? 0);
  const entities = Array.isArray(body?.entities) ? body.entities.length : 0;

  if (!Number.isFinite(months) || months < 1 || months > 120) {
    return jsonError(400, "DATE_RANGE_EXCEEDED", "Compare requests are limited to 120 months.");
  }
  if (entities < 2 || entities > 5) {
    return jsonError(400, "ENTITY_LIMIT_EXCEEDED", "Compare requests are limited to 2-5 entities.");
  }

  await recordAuditEvent({
    session,
    eventType: "compare_query",
    route: "/api/v1/compare/query",
    outcome: "accepted",
    metadata: {
      dateRangeMonths: months,
      entityCount: entities,
    },
  });

  return jsonOk({
    status: "accepted",
    executionMode: "read-only",
    featureStatus: "phase1_gateway_ready",
  });
}
