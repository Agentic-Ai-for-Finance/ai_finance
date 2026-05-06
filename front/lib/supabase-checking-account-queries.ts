import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import type { CheckingAccountOperationName } from "@/lib/checking-account-config";

const METRICS_PAGE_SIZE = 1000;

export type CheckingAccountMetricRow = {
  account_type: CheckingAccountOperationName;
  dataset_code: string;
  institution_code: string;
  institution_name: string;
  period_month: string;
  account_count: string;
  nominal_balance_millions_clp: string;
  uf_date_used: string;
  uf_value_used: string;
  real_balance_uf: string;
  average_balance_uf: string;
  source_dataset_code: string;
  updated_at: string;
};

export async function fetchCheckingAccountDatasetBoundary(
  operation: CheckingAccountOperationName,
  boundary: "latest" | "earliest"
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const ascending = boundary === "earliest";

  const { data, error } = await supabase
    .from("checking_accounts_metrics")
    .select("period_month")
    .eq("account_type", operation)
    .order("period_month", { ascending })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0]?.period_month ?? null;
}

export async function fetchCheckingAccountMetrics(
  operation: CheckingAccountOperationName,
  startDateIso: string,
  endDateIso: string
): Promise<CheckingAccountMetricRow[]> {
  const supabase = getSupabaseBrowserClient();
  const rows: CheckingAccountMetricRow[] = [];
  let pageStart = 0;

  while (true) {
    const pageEnd = pageStart + METRICS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("checking_accounts_metrics")
      .select(
        "account_type,dataset_code,institution_code,institution_name,period_month,account_count,nominal_balance_millions_clp,uf_date_used,uf_value_used,real_balance_uf,average_balance_uf,source_dataset_code,updated_at"
      )
      .eq("account_type", operation)
      .gte("period_month", startDateIso)
      .lte("period_month", endDateIso)
      .order("period_month", { ascending: true })
      .order("institution_name", { ascending: true })
      .range(pageStart, pageEnd);

    if (error) {
      throw new Error(error.message);
    }

    const pageRows = (data ?? []) as CheckingAccountMetricRow[];
    rows.push(...pageRows);

    if (pageRows.length < METRICS_PAGE_SIZE) {
      break;
    }

    pageStart += METRICS_PAGE_SIZE;
  }

  return rows;
}
