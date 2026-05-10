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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    await recordAuditEvent({
      session,
      eventType: "compare_query",
      route: "/api/v1/compare/query",
      outcome: "rejected",
      metadata: { reason: "invalid_body" },
    });
    return jsonError(400, "INVALID_BODY", "Request body must be a JSON object.");
  }

  const months = Number(body?.dateRangeMonths ?? 0);
  const entities: unknown[] = Array.isArray(body.entities) ? body.entities : [];
  const entityCount = entities.length;

  if (!Number.isFinite(months) || months < 1 || months > 120) {
    await recordAuditEvent({
      session,
      eventType: "compare_query",
      route: "/api/v1/compare/query",
      outcome: "rejected",
      metadata: { reason: "date_range_exceeded", dateRangeMonths: months },
    });
    return jsonError(400, "DATE_RANGE_EXCEEDED", "Compare requests are limited to 120 months.");
  }
  if (entityCount < 2 || entityCount > 5) {
    await recordAuditEvent({
      session,
      eventType: "compare_query",
      route: "/api/v1/compare/query",
      outcome: "rejected",
      metadata: { reason: "entity_limit_exceeded", entityCount },
    });
    return jsonError(400, "ENTITY_LIMIT_EXCEEDED", "Compare requests are limited to 2-5 entities.");
  }
  if (!entities.every((value: unknown) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= 120)) {
    await recordAuditEvent({
      session,
      eventType: "compare_query",
      route: "/api/v1/compare/query",
      outcome: "rejected",
      metadata: { reason: "invalid_entities_shape" },
    });
    return jsonError(400, "INVALID_ENTITIES", "Entities must be non-empty strings.");
  }

  await recordAuditEvent({
    session,
    eventType: "compare_query",
    route: "/api/v1/compare/query",
    outcome: "accepted",
    metadata: {
      dateRangeMonths: months,
      entityCount,
    },
  });

  return jsonOk({
    status: "accepted",
    executionMode: "read-only",
    featureStatus: "phase1_gateway_ready",
  });
}
