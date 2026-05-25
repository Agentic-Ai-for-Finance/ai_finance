export const CHILE_DOMAIN_ALLOWLIST = [
  // Regulators
  "cmfchile.cl",
  "bcentral.cl",
  "sii.cl",
  // Consulting & research
  "mckinsey.com",
  "bcg.com",
  "deloitte.com",
  "ey.com",
  "pwc.com",
  "kpmg.com",
  "bain.com",
  // Rating agencies
  "spglobal.com",
  "moodys.com",
  "fitchratings.com",
  "feller-rate.com",
  // International orgs
  "imf.org",
  "worldbank.org",
  "oecd.org",
  "bis.org",
  // Chilean banks
  "bancoestado.cl",
  "santander.cl",
  "bci.cl",
  "bancodechile.cl",
  "scotiabank.cl",
  "itau.cl",
  "falabella.com",
  // Chilean press & research
  "df.cl",
  "emol.com",
  "latercera.com",
  "elmercurio.com",
  "cnnchile.com",
  "pauta.cl",
  "americaeconomia.com",
  // International press
  "bloomberg.com",
  "reuters.com",
  "ft.com",
  "economist.com",
];

/** Shared result type — same shape regardless of search provider */
export type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
};

export type BankSummaryData = {
  name: string;
  value: number | null;
  growthPct: number | null;
  marketSharePct: number | null;
};

export type BankTimeSeriesData = {
  name: string;
  data: Record<string, number>;
};

export type SearchContext = {
  sectionLabel: string;
  operationLabel: string;
  viewLabel: string;
  viewUnit?: string;
  startMonth: string;
  endMonth: string;
  selectedBanks: { code: string; name: string }[];
  bankSummaries?: BankSummaryData[];
  timeSeries?: BankTimeSeriesData[];
};

const SECTION_ES: Record<string, string> = {
  "Credit Cards": "tarjetas de crédito",
  "Debit Cards": "tarjetas de débito",
  "Prepaid Cards": "tarjetas prepago",
  "Checking Accounts": "cuentas corrientes",
};

const OPERATION_ES: Record<string, string> = {
  Purchases: "compras",
  "Cash Advances": "avance en efectivo",
  Fees: "cargos por servicio",
  "Debit Transactions": "transacciones de débito",
  "ATM Withdrawals": "retiros en cajeros automáticos",
  Utilities: "pagos de servicios",
  "Operation Metrics": "métricas de activación",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonthForQuery(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const monthIndex = Number(month) - 1;
  return `${MONTH_NAMES[monthIndex] ?? month} ${year}`;
}

/** Convert YYYY-MM to ISO date string for Exa date filters */
function toIsoDate(yyyyMm: string): string {
  return `${yyyyMm}-01T00:00:00.000Z`;
}

type ExaSearchResult = {
  title: string;
  url: string;
  text?: string;
  score: number;
};

type ExaSearchResponse = {
  results: ExaSearchResult[];
};

function buildSearchQueries(userQuery: string, context?: SearchContext): string[] {
  if (!context) {
    return [`Chilean financial market analysis: ${userQuery}`];
  }

  const sectionEs = SECTION_ES[context.sectionLabel] ?? context.sectionLabel;
  const operationEs = OPERATION_ES[context.operationLabel] ?? context.operationLabel;
  const topBanks = context.selectedBanks.slice(0, 5).map((b) => b.name).join(", ");

  // Query 1: English — semantic query about the product and user question
  const q1 = `Chilean banking ${context.sectionLabel} ${context.operationLabel} market analysis trends ${userQuery}`;

  // Query 2: Spanish — finds Chilean-language reports and bank-specific analysis
  const q2 = `Chile análisis mercado bancario ${sectionEs} ${operationEs} ${topBanks}`;

  return [q1, q2];
}

async function runExaSearch(
  apiKey: string,
  query: string,
  maxResults: number,
  context?: SearchContext
): Promise<TavilyResult[]> {
  const body: Record<string, unknown> = {
    query,
    numResults: maxResults,
    type: "auto",
    contents: {
      text: { maxCharacters: 1500 },
    },
    includeDomains: CHILE_DOMAIN_ALLOWLIST,
  };

  // Use date filtering when we have dashboard context
  if (context) {
    body.startPublishedDate = toIsoDate(context.startMonth);
  }

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown");
    throw new Error(`Exa API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as ExaSearchResponse;

  return (data.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.url,
    content: r.text ?? "",
    score: r.score ?? 0,
  }));
}

export async function searchChileFocused(
  userQuery: string,
  options?: { maxResults?: number; context?: SearchContext }
) {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("EXA_API_KEY is not configured.");
  }

  const totalMax = options?.maxResults ?? (Number(process.env.SEARCH_MAX_RESULTS) || 10);
  const queries = buildSearchQueries(userQuery, options?.context);

  // Run searches in parallel — split results budget across queries
  const perQuery = Math.ceil(totalMax / queries.length);
  const searchPromises = queries.map((q) => runExaSearch(apiKey, q, perQuery, options?.context));
  const allResults = await Promise.all(searchPromises);

  // Deduplicate by URL, keep highest score
  const seen = new Map<string, TavilyResult>();
  for (const results of allResults) {
    for (const r of results) {
      const existing = seen.get(r.url);
      if (!existing || r.score > existing.score) {
        seen.set(r.url, r);
      }
    }
  }

  // Sort by score descending, cap at totalMax
  const dedupedResults = Array.from(seen.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, totalMax);

  return {
    results: dedupedResults,
    augmentedQuery: queries[0],
  };
}
