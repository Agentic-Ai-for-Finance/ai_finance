import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

const METRICS_PAGE_SIZE = 1000;

export type MetricAccessScope = "public" | "protected";

type DatasetName =
  | "credit-card-ops"
  | "credit-card-activation"
  | "debit-card-ops"
  | "debit-card-activation"
  | "prepaid-card-ops"
  | "prepaid-card-activation"
  | "checking-accounts"
  | "uf-latest";

type MetricQuery =
  | {
      dataset: Exclude<DatasetName, "uf-latest">;
      mode: "boundary";
      boundary: "latest" | "earliest";
      operation?: string;
      customerType?: string;
    }
  | {
      dataset: Exclude<DatasetName, "uf-latest">;
      mode: "rows";
      start: string;
      end: string;
      operation?: string;
      customerType?: string;
    }
  | {
      dataset: "uf-latest";
      mode: "latest";
      today: string;
    };

type DatasetConfig = {
  table: string;
  publicSelect: string;
  protectedSelect: string;
  defaultOrderField?: string;
  applyFilters: (
    query: ReturnType<ReturnType<typeof getSupabaseAdminClient>["from"]>["select"],
    params: Record<string, string>
  ) => ReturnType<ReturnType<typeof getSupabaseAdminClient>["from"]>["select"];
};

const DATASET_CONFIG: Record<Exclude<DatasetName, "uf-latest">, DatasetConfig> = {
  "credit-card-ops": {
    table: "bank_credit_card_ops_metrics",
    publicSelect:
      "operation_type,dataset_code,institution_code,institution_name,period_month,transaction_count,source_dataset_code,updated_at",
    protectedSelect:
      "operation_type,dataset_code,institution_code,institution_name,period_month,transaction_count,nominal_volume_millions_clp,uf_date_used,uf_value_used,real_value_uf,average_ticket_uf,total_active_cards,operations_per_active_card,source_dataset_code,updated_at",
    applyFilters: (query, params) => query.eq("operation_type", params.operation),
  },
  "credit-card-activation": {
    table: "bank_credit_card_operations_rate_metrics",
    publicSelect:
      "institution_code,institution_name,period_month,total_active_cards,total_cards_with_operations",
    protectedSelect:
      "institution_code,institution_name,period_month,total_active_cards,active_cards_primary,active_cards_supplementary,cards_with_operations_primary,cards_with_operations_supplementary,total_cards_with_operations,operations_rate",
    applyFilters: (query) => query,
  },
  "debit-card-ops": {
    table: "bank_debit_card_ops_metrics",
    publicSelect:
      "operation_type,dataset_code,institution_code,institution_name,period_month,transaction_count,source_dataset_code,updated_at",
    protectedSelect:
      "operation_type,dataset_code,institution_code,institution_name,period_month,transaction_count,nominal_volume_millions_clp,uf_date_used,uf_value_used,real_value_uf,average_ticket_uf,total_active_cards,operations_per_active_card,source_dataset_code,updated_at",
    applyFilters: (query, params) => query.eq("operation_type", params.operation),
  },
  "debit-card-activation": {
    table: "bank_debit_card_operation_metrics",
    publicSelect:
      "institution_code,institution_name,period_month,total_active_cards,total_cards_with_operations",
    protectedSelect:
      "institution_code,institution_name,period_month,total_active_cards,active_cards_primary,active_cards_supplementary,total_cards_with_operations,operations_rate,supplementary_rate",
    applyFilters: (query) => query,
  },
  "prepaid-card-ops": {
    table: "prepaid_card_ops_metrics",
    publicSelect:
      "customer_type,operation_type,dataset_code,institution_code,institution_name,period_month,transaction_count,source_dataset_code,updated_at",
    protectedSelect:
      "customer_type,operation_type,dataset_code,institution_code,institution_name,period_month,transaction_count,nominal_volume_millions_clp,uf_date_used,uf_value_used,real_value_uf,average_ticket_uf,total_active_cards,operations_per_active_card,source_dataset_code,updated_at",
    applyFilters: (query, params) => query.eq("customer_type", params.customerType).eq("operation_type", params.operation),
  },
  "prepaid-card-activation": {
    table: "prepaid_card_operation_metrics",
    publicSelect:
      "customer_type,institution_code,institution_name,period_month,total_active_cards,total_cards_with_operations",
    protectedSelect:
      "customer_type,institution_code,institution_name,period_month,total_active_cards,total_cards_with_operations,operations_rate",
    applyFilters: (query, params) => query.eq("customer_type", params.customerType),
  },
  "checking-accounts": {
    table: "checking_accounts_metrics",
    publicSelect:
      "account_type,dataset_code,institution_code,institution_name,period_month,account_count,source_dataset_code,updated_at",
    protectedSelect:
      "account_type,dataset_code,institution_code,institution_name,period_month,account_count,nominal_balance_millions_clp,uf_date_used,uf_value_used,real_balance_uf,average_balance_uf,source_dataset_code,updated_at",
    applyFilters: (query, params) => query.eq("account_type", params.operation),
  },
};

function ensureMonthDate(value: string | null, field: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ${field}. Expected YYYY-MM-DD.`);
  }
}

function ensureMonthValue(value: string | null, field: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ${field}. Expected YYYY-MM.`);
  }
}

function parseMetricQuery(searchParams: URLSearchParams): MetricQuery {
  const dataset = searchParams.get("dataset") as DatasetName | null;
  const mode = searchParams.get("mode");

  if (dataset === "uf-latest") {
    const today = searchParams.get("today");
    if (mode !== "latest" || !today) {
      throw new Error("UF requests require dataset=uf-latest, mode=latest, and today.");
    }

    ensureMonthDate(today, "today");
    return { dataset, mode, today };
  }

  if (!dataset || !(dataset in DATASET_CONFIG)) {
    throw new Error("Unsupported dataset.");
  }

  if (mode === "boundary") {
    const boundary = searchParams.get("boundary");
    if (boundary !== "latest" && boundary !== "earliest") {
      throw new Error("Boundary requests require boundary=latest or boundary=earliest.");
    }
    return {
      dataset,
      mode,
      boundary,
      operation: searchParams.get("operation") ?? undefined,
      customerType: searchParams.get("customerType") ?? undefined,
    };
  }

  if (mode === "rows") {
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    ensureMonthDate(start, "start");
    ensureMonthDate(end, "end");
    return {
      dataset,
      mode,
      start: start as string,
      end: end as string,
      operation: searchParams.get("operation") ?? undefined,
      customerType: searchParams.get("customerType") ?? undefined,
    };
  }

  throw new Error("Unsupported mode.");
}

function buildFilterParams(query: MetricQuery) {
  if (query.dataset === "uf-latest") {
    return {
      operation: "",
      customerType: "",
    };
  }

  return {
    operation: "operation" in query ? query.operation ?? "" : "",
    customerType: "customerType" in query ? query.customerType ?? "" : "",
  };
}

async function fetchUfLatest(today: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("uf_values")
    .select("uf_date, value")
    .lte("uf_date", today)
    .order("uf_date", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) {
    throw new Error("No UF value is available up to today's Santiago date.");
  }

  const rows = data as Array<{ uf_date: string; value: string | number }>;

  return {
    ufDate: rows[0].uf_date,
    value: Number(rows[0].value),
  };
}

async function fetchBoundary(query: Extract<MetricQuery, { mode: "boundary" }>, scope: MetricAccessScope) {
  const config = DATASET_CONFIG[query.dataset];
  const supabase = getSupabaseAdminClient();
  const ascending = query.boundary === "earliest";
  let builder = supabase.from(config.table).select("period_month");
  builder = config.applyFilters(builder, buildFilterParams(query));

  const { data, error } = await builder.order("period_month", { ascending }).limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{ period_month: string }>;

  return {
    boundary: query.boundary,
    dataset: query.dataset,
    access: scope,
    periodMonth: rows[0]?.period_month ?? null,
  };
}

async function fetchRows(query: Extract<MetricQuery, { mode: "rows" }>, scope: MetricAccessScope) {
  const config = DATASET_CONFIG[query.dataset];
  const selectClause = scope === "protected" ? config.protectedSelect : config.publicSelect;
  const supabase = getSupabaseAdminClient();
  const rows: Record<string, unknown>[] = [];
  let pageStart = 0;

  while (true) {
    let builder = supabase.from(config.table).select(selectClause);
    builder = config.applyFilters(builder, buildFilterParams(query));

    const { data, error } = await builder
      .gte("period_month", query.start)
      .lte("period_month", query.end)
      .order("period_month", { ascending: true })
      .order("institution_name", { ascending: true })
      .range(pageStart, pageStart + METRICS_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const pageRows = (data ?? []) as Record<string, unknown>[];
    rows.push(...pageRows);

    if (pageRows.length < METRICS_PAGE_SIZE) {
      break;
    }

    pageStart += METRICS_PAGE_SIZE;
  }

  return {
    dataset: query.dataset,
    access: scope,
    rows,
  };
}

export async function resolveMetricRequest(url: string, scope: MetricAccessScope) {
  const requestUrl = new URL(url);
  const parsed = parseMetricQuery(requestUrl.searchParams);

  if (parsed.dataset === "uf-latest") {
    return fetchUfLatest(parsed.today);
  }

  if ((parsed.dataset === "credit-card-ops" || parsed.dataset === "debit-card-ops" || parsed.dataset === "checking-accounts") && !parsed.operation) {
    throw new Error("This dataset requires an operation parameter.");
  }

  if ((parsed.dataset === "prepaid-card-ops" || parsed.dataset === "prepaid-card-activation") && !parsed.customerType) {
    throw new Error("This dataset requires a customerType parameter.");
  }

  if (parsed.dataset === "prepaid-card-ops" && !parsed.operation) {
    throw new Error("This dataset requires an operation parameter.");
  }

  return parsed.mode === "boundary" ? fetchBoundary(parsed, scope) : fetchRows(parsed, scope);
}
