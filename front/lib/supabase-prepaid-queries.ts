import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import type { PrepaidCustomerType, PrepaidOperationName } from "@/lib/prepaid-card-config";

const METRICS_PAGE_SIZE = 1000;

export type PrepaidCardMetricRow = {
  customer_type: PrepaidCustomerType;
  operation_type: Exclude<PrepaidOperationName, "Total Activation Rate">;
  dataset_code: string;
  institution_code: string;
  institution_name: string;
  period_month: string;
  transaction_count: string;
  nominal_volume_millions_clp: string;
  uf_date_used: string;
  uf_value_used: string;
  real_value_uf: string;
  average_ticket_uf: string;
  total_active_cards: string | null;
  operations_per_active_card: string | null;
  source_dataset_code: string;
  updated_at: string;
};

export type PrepaidOperationMetricRow = {
  customer_type: PrepaidCustomerType;
  institution_code: string;
  institution_name: string;
  period_month: string;
  total_active_cards: string;
  total_cards_with_operations: string;
  operations_rate: string | null;
};

export async function fetchPrepaidDatasetBoundary(
  customerType: PrepaidCustomerType,
  operation: Exclude<PrepaidOperationName, "Total Activation Rate">,
  boundary: "latest" | "earliest"
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const ascending = boundary === "earliest";

  const { data, error } = await supabase
    .from("prepaid_card_ops_metrics")
    .select("period_month")
    .eq("customer_type", customerType)
    .eq("operation_type", operation)
    .order("period_month", { ascending })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0]?.period_month ?? null;
}

export async function fetchPrepaidCardMetrics(
  customerType: PrepaidCustomerType,
  operation: Exclude<PrepaidOperationName, "Total Activation Rate">,
  startDateIso: string,
  endDateIso: string
): Promise<PrepaidCardMetricRow[]> {
  const supabase = getSupabaseBrowserClient();
  const rows: PrepaidCardMetricRow[] = [];
  let pageStart = 0;

  while (true) {
    const pageEnd = pageStart + METRICS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("prepaid_card_ops_metrics")
      .select(
        "customer_type,operation_type,dataset_code,institution_code,institution_name,period_month,transaction_count,nominal_volume_millions_clp,uf_date_used,uf_value_used,real_value_uf,average_ticket_uf,total_active_cards,operations_per_active_card,source_dataset_code,updated_at"
      )
      .eq("customer_type", customerType)
      .eq("operation_type", operation)
      .gte("period_month", startDateIso)
      .lte("period_month", endDateIso)
      .order("period_month", { ascending: true })
      .order("institution_name", { ascending: true })
      .range(pageStart, pageEnd);

    if (error) {
      throw new Error(error.message);
    }

    const pageRows = (data ?? []) as PrepaidCardMetricRow[];
    rows.push(...pageRows);

    if (pageRows.length < METRICS_PAGE_SIZE) {
      break;
    }

    pageStart += METRICS_PAGE_SIZE;
  }

  return rows;
}

export async function fetchPrepaidOperationMetricsBoundary(
  customerType: PrepaidCustomerType,
  boundary: "latest" | "earliest"
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const ascending = boundary === "earliest";

  const { data, error } = await supabase
    .from("prepaid_card_operation_metrics")
    .select("period_month")
    .eq("customer_type", customerType)
    .order("period_month", { ascending })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0]?.period_month ?? null;
}

export async function fetchPrepaidOperationMetrics(
  customerType: PrepaidCustomerType,
  startDateIso: string,
  endDateIso: string
): Promise<PrepaidOperationMetricRow[]> {
  const supabase = getSupabaseBrowserClient();
  const rows: PrepaidOperationMetricRow[] = [];
  let pageStart = 0;

  while (true) {
    const pageEnd = pageStart + METRICS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("prepaid_card_operation_metrics")
      .select("customer_type,institution_code,institution_name,period_month,total_active_cards,total_cards_with_operations,operations_rate")
      .eq("customer_type", customerType)
      .gte("period_month", startDateIso)
      .lte("period_month", endDateIso)
      .order("period_month", { ascending: true })
      .order("institution_name", { ascending: true })
      .range(pageStart, pageEnd);

    if (error) {
      throw new Error(error.message);
    }

    const pageRows = (data ?? []) as PrepaidOperationMetricRow[];
    rows.push(...pageRows);

    if (pageRows.length < METRICS_PAGE_SIZE) {
      break;
    }

    pageStart += METRICS_PAGE_SIZE;
  }

  return rows;
}
