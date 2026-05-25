export const CHILE_DOMAIN_ALLOWLIST = [
  // Regulators
  "cmfchile.cl",
  "bcentral.cl",
  // Consulting
  "mckinsey.com",
  "bcg.com",
  "deloitte.com",
  "ey.com",
  "pwc.com",
  "kpmg.com",
  "bain.com",
  // International orgs
  "imf.org",
  "worldbank.org",
  "oecd.org",
  // Chilean banks
  "bancoestado.cl",
  "santander.cl",
  "bci.cl",
  "bancodechile.cl",
  "scotiabank.cl",
  "itau.cl",
  // Chilean press
  "df.cl",
  "emol.com",
  "latercera.com",
  "elmercurio.com",
  // International press
  "bloomberg.com",
  "reuters.com",
  "ft.com",
];

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

export type SearchContext = {
  sectionLabel: string;
  operationLabel: string;
  viewLabel: string;
  startMonth: string;
  endMonth: string;
  selectedBanks: { code: string; name: string }[];
  bankSummaries?: BankSummaryData[];
};

type TavilySearchResponse = {
  results: TavilyResult[];
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

function buildAugmentedQuery(userQuery: string, context?: SearchContext): string {
  const parts = ["Chile"];

  if (context) {
    // English context
    parts.push(context.sectionLabel, context.operationLabel);

    // Spanish context for bilingual search
    const sectionEs = SECTION_ES[context.sectionLabel];
    const operationEs = OPERATION_ES[context.operationLabel] ?? context.operationLabel;
    if (sectionEs) parts.push(sectionEs, operationEs);

    // Time range — explicit dates to bias results toward this period
    const startLabel = formatMonthForQuery(context.startMonth);
    const endLabel = formatMonthForQuery(context.endMonth);
    parts.push(`during ${startLabel} to ${endLabel}`, `entre ${startLabel} y ${endLabel}`);

    // Selected banks (up to 15)
    const bankNames = context.selectedBanks.slice(0, 15).map((b) => b.name);
    if (bankNames.length) parts.push(bankNames.join(", "));
  } else {
    parts.push("Chilean financial market");
  }

  parts.push(userQuery);
  return parts.join(" ");
}

export async function searchChileFocused(
  userQuery: string,
  options?: { maxResults?: number; context?: SearchContext }
) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  const maxResults = options?.maxResults ?? (Number(process.env.SEARCH_MAX_RESULTS) || 8);
  const augmentedQuery = buildAugmentedQuery(userQuery, options?.context);

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: augmentedQuery,
      search_depth: "advanced",
      include_domains: CHILE_DOMAIN_ALLOWLIST,
      max_results: maxResults,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown");
    throw new Error(`Tavily API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as TavilySearchResponse;

  return {
    results: data.results ?? [],
    augmentedQuery,
  };
}
