import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/server/http";
import { buildHomepageMetrics } from "@/lib/server/homepage-metrics";
import { checkRateLimit } from "@/lib/server/rate-limit";

const PUBLIC_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_LIMIT = 300;

export async function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`public-homepage:${ip}`, PUBLIC_LIMIT, PUBLIC_WINDOW_MS);

  if (!rateLimit.ok) {
    return jsonError(429, "RATE_LIMITED", "Public homepage rate limit exceeded.", {
      limit: PUBLIC_LIMIT,
      resetAt: rateLimit.resetAt,
    });
  }

  try {
    const payload = await buildHomepageMetrics();
    return jsonOk(payload);
  } catch (error) {
    console.error("public homepage metrics error", error);
    return jsonError(
      500,
      "HOMEPAGE_METRICS_FAILED",
      "Unable to load homepage metrics."
    );
  }
}
