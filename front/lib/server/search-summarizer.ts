import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { TavilyResult, SearchContext, BankSummaryData } from "@/lib/server/tavily";

const SYSTEM_PROMPT = `You are a financial research analyst specializing in the Chilean market.

Given a set of search results, synthesize them into a concise, professional summary.

Rules:
- Focus on Chile-specific financial insights and data.
- Use numbered citations [1], [2], etc. that map to the provided sources list.
- Write in a professional financial analyst tone.
- Keep the summary focused and actionable.
- If the search results are insufficient to answer the query, state that clearly. Do not hallucinate or fabricate information.
- Always respond in English, unless the user query is explicitly written in Spanish.
- You may encounter sources in both English and Spanish. Use information from both languages regardless of the response language.`;

function formatBankSummaryLine(b: BankSummaryData): string {
  const parts = [b.name];
  if (b.value !== null) parts.push(`value: ${b.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
  if (b.growthPct !== null) parts.push(`growth: ${(b.growthPct * 100).toFixed(1)}%`);
  if (b.marketSharePct !== null) parts.push(`market share: ${(b.marketSharePct * 100).toFixed(1)}%`);
  return parts.join(" | ");
}

function buildContextBlock(context: SearchContext): string {
  const lines = [
    `Product: ${context.sectionLabel}`,
    `Operation: ${context.operationLabel}`,
    `Metric: ${context.viewLabel}`,
    `Period: ${context.startMonth} to ${context.endMonth}`,
  ];

  if (context.selectedBanks.length) {
    const names = context.selectedBanks.map((b) => b.name).join(", ");
    lines.push(`Selected banks: ${names}`);
  }

  if (context.bankSummaries?.length) {
    lines.push("");
    lines.push(`Current dashboard data (${context.viewLabel}, end of period):`);
    context.bankSummaries.forEach((b) => lines.push(`  - ${formatBankSummaryLine(b)}`));
  }

  return lines.join("\n");
}

function buildUserPrompt(
  query: string,
  results: TavilyResult[],
  context?: SearchContext
): string {
  const sourcesBlock = results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
    .join("\n\n");

  const parts: string[] = [];

  if (context) {
    parts.push(
      "The user is currently viewing the following dashboard:\n" +
        buildContextBlock(context) +
        "\n\nFrame your answer in the context of this specific product, metric, time period, and banks." +
        ` Focus on information from the period ${context.startMonth} to ${context.endMonth}. Do not emphasize recent or forward-looking news unless it directly explains what happened during that period.`
    );
  }

  parts.push(`User query: ${query}`);
  parts.push(`Search results:\n\n${sourcesBlock}`);
  parts.push("Provide a research summary with citations.");

  return parts.join("\n\n");
}

export async function summarizeSearchResults(
  query: string,
  results: TavilyResult[],
  context?: SearchContext
) {
  const model = process.env.SEARCH_MODEL ?? "gpt-4o-mini";

  const { text } = await generateText({
    model: openai(model),
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(query, results, context),
    maxOutputTokens: 1500,
  });

  return { text, model };
}
