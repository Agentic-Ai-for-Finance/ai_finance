import { NextRequest } from "next/server";
import { getCurrentAppSession } from "@/lib/server/app-auth";
import { recordAuditEvent } from "@/lib/server/audit";
import { jsonError, jsonOk } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { searchChileFocused, type SearchContext } from "@/lib/server/tavily";
import { summarizeSearchResults } from "@/lib/server/search-summarizer";

export const maxDuration = 30;

const SEARCH_WINDOW_MS = 60 * 60 * 1000;
const ROUTE = "/api/v1/analysis/search";

function parseContext(raw: unknown): SearchContext | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const ctx = raw as Record<string, unknown>;

  if (
    typeof ctx.sectionLabel !== "string" ||
    typeof ctx.operationLabel !== "string" ||
    typeof ctx.viewLabel !== "string" ||
    typeof ctx.startMonth !== "string" ||
    typeof ctx.endMonth !== "string" ||
    !Array.isArray(ctx.selectedBanks)
  ) {
    return undefined;
  }

  const bankSummaries = Array.isArray(ctx.bankSummaries)
    ? ctx.bankSummaries
        .filter((s: unknown) => s && typeof s === "object" && typeof (s as Record<string, unknown>).name === "string")
        .map((s: unknown) => {
          const row = s as Record<string, unknown>;
          return {
            name: row.name as string,
            value: typeof row.value === "number" ? row.value : null,
            growthPct: typeof row.growthPct === "number" ? row.growthPct : null,
            marketSharePct: typeof row.marketSharePct === "number" ? row.marketSharePct : null,
          };
        })
    : undefined;

  return {
    sectionLabel: ctx.sectionLabel,
    operationLabel: ctx.operationLabel,
    viewLabel: ctx.viewLabel,
    startMonth: ctx.startMonth,
    endMonth: ctx.endMonth,
    selectedBanks: ctx.selectedBanks
      .filter((b: unknown) => b && typeof b === "object" && typeof (b as Record<string, unknown>).code === "string" && typeof (b as Record<string, unknown>).name === "string")
      .map((b: unknown) => ({ code: (b as Record<string, string>).code, name: (b as Record<string, string>).name })),
    bankSummaries,
  };
}

export async function POST(request: NextRequest) {
  const session = await getCurrentAppSession();

  if (!session) {
    return jsonError(401, "AUTH_REQUIRED", "Authentication is required for search.");
  }

  const limit = session.role === "admin" ? 60 : 20;
  const rateLimit = checkRateLimit(`search:${session.userId}`, limit, SEARCH_WINDOW_MS);
  if (!rateLimit.ok) {
    await recordAuditEvent({
      session,
      eventType: "research_search",
      route: ROUTE,
      outcome: "rate_limited",
    });
    return jsonError(429, "RATE_LIMITED", "Search quota exceeded.", { limit, resetAt: rateLimit.resetAt });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "INVALID_BODY", "Request body must be a JSON object.");
  }

  const query = body.query;
  if (typeof query !== "string" || query.trim().length < 3 || query.trim().length > 500) {
    await recordAuditEvent({
      session,
      eventType: "research_search",
      route: ROUTE,
      outcome: "rejected",
      metadata: { reason: "invalid_query" },
    });
    return jsonError(400, "INVALID_QUERY", "Query must be a string between 3 and 500 characters.");
  }

  const context = parseContext(body.context);

  await recordAuditEvent({
    session,
    eventType: "research_search",
    route: ROUTE,
    outcome: "accepted",
    metadata: {
      queryLength: query.trim().length,
      hasContext: Boolean(context),
      section: context?.sectionLabel,
      bankCount: context?.selectedBanks.length,
    },
  });

  try {
    const { results: tavilyResults, augmentedQuery } = await searchChileFocused(query.trim(), { context });

    if (tavilyResults.length === 0) {
      return jsonOk({
        summary: "",
        sources: [],
        query: augmentedQuery,
        model: process.env.SEARCH_MODEL ?? "gpt-4o-mini",
        searchResultCount: 0,
      });
    }

    const { text, model } = await summarizeSearchResults(query.trim(), tavilyResults, context);

    const sources = tavilyResults.map((r) => ({
      title: r.title,
      url: r.url,
      domain: new URL(r.url).hostname.replace(/^www\./, ""),
      snippet: r.content.slice(0, 200),
    }));

    await recordAuditEvent({
      session,
      eventType: "research_search",
      route: ROUTE,
      outcome: "completed",
      metadata: { resultCount: tavilyResults.length, model },
    });

    return jsonOk({
      summary: text,
      sources,
      query: augmentedQuery,
      model,
      searchResultCount: tavilyResults.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upstream error";
    console.error("Search upstream error:", message);

    await recordAuditEvent({
      session,
      eventType: "research_search",
      route: ROUTE,
      outcome: "upstream_error",
      metadata: { error: message },
    });

    return jsonError(502, "UPSTREAM_ERROR", "Search service temporarily unavailable.");
  }
}
