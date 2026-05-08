import { getJson } from "@/lib/api-client";
import type { OperationName } from "@/lib/credit-card-config";

export type MetricAccess = "public" | "protected";

export type CreditCardMetricRow = {
  operation_type: Exclude<OperationName, "Total Activation Rate">;
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

export type OperationsRateMetricRow = {
  institution_code: string;
  institution_name: string;
  period_month: string;
  total_active_cards: string;
  active_cards_primary?: string | null;
  active_cards_supplementary?: string | null;
  cards_with_operations_primary?: string | null;
  cards_with_operations_supplementary?: string | null;
  total_cards_with_operations: string;
  operations_rate?: string | null;
};

export async function fetchDatasetBoundary(
  operation: Exclude<OperationName, "Total Activation Rate">,
  boundary: "latest" | "earliest"
): Promise<string | null> {
  const response = await getJson<{ periodMonth: string | null }>(
    `/api/v1/public/metrics?dataset=credit-card-ops&mode=boundary&operation=${encodeURIComponent(operation)}&boundary=${boundary}`
  );

  return response.periodMonth;
}

export async function fetchLatestUfValue(todayIso: string): Promise<{ ufDate: string; value: number }> {
  return getJson(`/api/v1/public/metrics?dataset=uf-latest&mode=latest&today=${encodeURIComponent(todayIso)}`);
}

export async function fetchCreditCardMetrics(
  operation: Exclude<OperationName, "Total Activation Rate">,
  startDateIso: string,
  endDateIso: string,
  access: MetricAccess
): Promise<CreditCardMetricRow[]> {
  const basePath = access === "protected" ? "/api/v1/protected/metrics" : "/api/v1/public/metrics";
  const response = await getJson<{ rows: CreditCardMetricRow[] }>(
    `${basePath}?dataset=credit-card-ops&mode=rows&operation=${encodeURIComponent(operation)}&start=${encodeURIComponent(startDateIso)}&end=${encodeURIComponent(endDateIso)}`
  );

  return response.rows;
}

export async function fetchOperationsRateBoundary(
  boundary: "latest" | "earliest"
): Promise<string | null> {
  const response = await getJson<{ periodMonth: string | null }>(
    `/api/v1/public/metrics?dataset=credit-card-activation&mode=boundary&boundary=${boundary}`
  );

  return response.periodMonth;
}

export async function fetchOperationsRateMetrics(
  startDateIso: string,
  endDateIso: string,
  access: MetricAccess
): Promise<OperationsRateMetricRow[]> {
  const basePath = access === "protected" ? "/api/v1/protected/metrics" : "/api/v1/public/metrics";
  const response = await getJson<{ rows: OperationsRateMetricRow[] }>(
    `${basePath}?dataset=credit-card-activation&mode=rows&start=${encodeURIComponent(startDateIso)}&end=${encodeURIComponent(endDateIso)}`
  );

  return response.rows;
}
