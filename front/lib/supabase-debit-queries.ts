import { getJson } from "@/lib/api-client";
import type { MetricAccess } from "@/lib/supabase-queries";

export type DebitCardMetricRow = {
  operation_type: "Debit Transactions" | "ATM Withdrawals";
  dataset_code: string;
  institution_code: string;
  institution_name: string;
  period_month: string;
  transaction_count: string;
  nominal_volume_millions_clp?: string | null;
  uf_date_used?: string | null;
  uf_value_used?: string | null;
  real_value_uf?: string | null;
  average_ticket_uf?: string | null;
  total_active_cards?: string | null;
  operations_per_active_card?: string | null;
  source_dataset_code: string;
  updated_at: string;
};

export type DebitOperationMetricRow = {
  institution_code: string;
  institution_name: string;
  period_month: string;
  total_active_cards: string;
  active_cards_primary?: string | null;
  active_cards_supplementary?: string | null;
  total_cards_with_operations: string;
  operations_rate?: string | null;
  supplementary_rate?: string | null;
};

export async function fetchDebitDatasetBoundary(
  operation: "Debit Transactions" | "ATM Withdrawals",
  boundary: "latest" | "earliest"
): Promise<string | null> {
  const response = await getJson<{ periodMonth: string | null }>(
    `/api/v1/public/metrics?dataset=debit-card-ops&mode=boundary&operation=${encodeURIComponent(operation)}&boundary=${boundary}`
  );

  return response.periodMonth;
}

export async function fetchDebitCardMetrics(
  operation: "Debit Transactions" | "ATM Withdrawals",
  startDateIso: string,
  endDateIso: string,
  access: MetricAccess
): Promise<DebitCardMetricRow[]> {
  const basePath = access === "protected" ? "/api/v1/protected/metrics" : "/api/v1/public/metrics";
  const response = await getJson<{ rows: DebitCardMetricRow[] }>(
    `${basePath}?dataset=debit-card-ops&mode=rows&operation=${encodeURIComponent(operation)}&start=${encodeURIComponent(startDateIso)}&end=${encodeURIComponent(endDateIso)}`
  );

  return response.rows;
}

export async function fetchDebitOperationMetricsBoundary(
  boundary: "latest" | "earliest"
): Promise<string | null> {
  const response = await getJson<{ periodMonth: string | null }>(
    `/api/v1/public/metrics?dataset=debit-card-activation&mode=boundary&boundary=${boundary}`
  );

  return response.periodMonth;
}

export async function fetchDebitOperationMetrics(
  startDateIso: string,
  endDateIso: string,
  access: MetricAccess
): Promise<DebitOperationMetricRow[]> {
  const basePath = access === "protected" ? "/api/v1/protected/metrics" : "/api/v1/public/metrics";
  const response = await getJson<{ rows: DebitOperationMetricRow[] }>(
    `${basePath}?dataset=debit-card-activation&mode=rows&start=${encodeURIComponent(startDateIso)}&end=${encodeURIComponent(endDateIso)}`
  );

  return response.rows;
}
