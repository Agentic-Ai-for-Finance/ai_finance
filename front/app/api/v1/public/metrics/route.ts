import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { resolveMetricRequest } from "@/lib/server/metric-api";

const PUBLIC_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_LIMIT = 300;

export async function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`public:${ip}`, PUBLIC_LIMIT, PUBLIC_WINDOW_MS);

  if (!rateLimit.ok) {
    return jsonError(429, "RATE_LIMITED", "Public metrics rate limit exceeded.", {
      limit: PUBLIC_LIMIT,
      resetAt: rateLimit.resetAt,
    });
  }

  try {
    const payload = await resolveMetricRequest(request.url, "public");
    return jsonOk(payload);
  } catch (error) {
    return jsonError(400, "INVALID_PUBLIC_METRIC_REQUEST", error instanceof Error ? error.message : "Invalid request.");
  }
}
