import { NextRequest } from "next/server";
import { getCurrentAppSession } from "@/lib/server/app-auth";
import { recordAuditEvent } from "@/lib/server/audit";
import { jsonError, jsonOk } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { searchChileFocused, type SearchContext } from "@/lib/server/tavily";
import { streamSearchSummary } from "@/lib/server/search-summarizer";

export const maxDuration = 30;

const SEARCH_WINDOW_MS = 60 * 60 * 1000;
const ROUTE = "/api/v1/analysis/search";

/** Reject queries that attempt prompt injection or are clearly off-topic. */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+(a\s+)?different/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /modify\s+(the\s+)?(data|database|pipeline|record)/i,
  /delete\s+(the\s+)?(data|record|table|row)/i,
  /update\s+(the\s+)?(data|database|record)/i,
  /insert\s+into/i,
  /drop\s+table/i,
  /execute\s+(this\s+)?(code|query|command|script)/i,
];

function isQueryBlocked(query: string): string | null {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return "This query contains disallowed instructions. Please ask a research question about Chilean banking.";
    }
  }
  return null;
}

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
    viewUnit: typeof ctx.viewUnit === "string" ? ctx.viewUnit : undefined,
    startMonth: ctx.startMonth,
    endMonth: ctx.endMonth,
    selectedBanks: ctx.selectedBanks
      .filter((b: unknown) => b && typeof b === "object" && typeof (b as Record<string, unknown>).code === "string" && typeof (b as Record<string, unknown>).name === "string")
      .map((b: unknown) => ({ code: (b as Record<string, string>).code, name: (b as Record<string, string>).name })),
    bankSummaries,
    timeSeries: Array.isArray(ctx.timeSeries)
      ? ctx.timeSeries
          .filter((s: unknown) => s && typeof s === "object" && typeof (s as Record<string, unknown>).name === "string")
          .slice(0, 15)
          .map((s: unknown) => {
            const row = s as Record<string, unknown>;
            const rawData = row.data as Record<string, unknown> | undefined;
            const data: Record<string, number> = {};
            if (rawData && typeof rawData === "object") {
              for (const [k, v] of Object.entries(rawData)) {
                if (typeof v === "number") data[k] = v;
              }
            }
            return { name: row.name as string, data };
          })
      : undefined,
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

  const blocked = isQueryBlocked(query.trim());
  if (blocked) {
    await recordAuditEvent({
      session,
      eventType: "research_search",
      route: ROUTE,
      outcome: "rejected",
      metadata: { reason: "blocked_query" },
    });
    return jsonError(400, "BLOCKED_QUERY", blocked);
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
        model: process.env.SEARCH_MODEL ?? "gpt-4o",
        searchResultCount: 0,
      });
    }

    const { stream: streamResult, model } = streamSearchSummary(query.trim(), tavilyResults, context);

    const sources = tavilyResults.map((r) => ({
      title: r.title,
      url: r.url,
      domain: new URL(r.url).hostname.replace(/^www\./, ""),
      snippet: r.content.slice(0, 200),
    }));

    const metadata = JSON.stringify({
      sources,
      query: augmentedQuery,
      model,
      searchResultCount: tavilyResults.length,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        // Send metadata as the first line
        controller.enqueue(encoder.encode(`data: ${metadata}\n\n`));

        // Stream the summary text
        for await (const chunk of streamResult.textStream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        await recordAuditEvent({
          session,
          eventType: "research_search",
          route: ROUTE,
          outcome: "completed",
          metadata: { resultCount: tavilyResults.length, model },
        });
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
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
