import type { PrepaidCustomerType, PrepaidOperationName } from "@/lib/prepaid-card-config";
import { getJson } from "@/lib/api-client";
import type { MetricAccess } from "@/lib/supabase-queries";

export type PrepaidCardMetricRow = {
  customer_type: PrepaidCustomerType;
  operation_type: Exclude<PrepaidOperationName, "Total Activation Rate">;
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

export type PrepaidOperationMetricRow = {
  customer_type: PrepaidCustomerType;
  institution_code: string;
  institution_name: string;
  period_month: string;
  total_active_cards: string;
  total_cards_with_operations: string;
  operations_rate?: string | null;
};

export async function fetchPrepaidDatasetBoundary(
  customerType: PrepaidCustomerType,
  operation: Exclude<PrepaidOperationName, "Total Activation Rate">,
  boundary: "latest" | "earliest"
): Promise<string | null> {
  const response = await getJson<{ periodMonth: string | null }>(
    `/api/v1/public/metrics?dataset=prepaid-card-ops&mode=boundary&customerType=${encodeURIComponent(customerType)}&operation=${encodeURIComponent(operation)}&boundary=${boundary}`
  );

  return response.periodMonth;
}

export async function fetchPrepaidCardMetrics(
  customerType: PrepaidCustomerType,
  operation: Exclude<PrepaidOperationName, "Total Activation Rate">,
  startDateIso: string,
  endDateIso: string,
  access: MetricAccess
): Promise<PrepaidCardMetricRow[]> {
  const basePath = access === "protected" ? "/api/v1/protected/metrics" : "/api/v1/public/metrics";
  const response = await getJson<{ rows: PrepaidCardMetricRow[] }>(
    `${basePath}?dataset=prepaid-card-ops&mode=rows&customerType=${encodeURIComponent(customerType)}&operation=${encodeURIComponent(operation)}&start=${encodeURIComponent(startDateIso)}&end=${encodeURIComponent(endDateIso)}`
  );

  return response.rows;
}

export async function fetchPrepaidOperationMetricsBoundary(
  customerType: PrepaidCustomerType,
  boundary: "latest" | "earliest"
): Promise<string | null> {
  const response = await getJson<{ periodMonth: string | null }>(
    `/api/v1/public/metrics?dataset=prepaid-card-activation&mode=boundary&customerType=${encodeURIComponent(customerType)}&boundary=${boundary}`
  );

  return response.periodMonth;
}

export async function fetchPrepaidOperationMetrics(
  customerType: PrepaidCustomerType,
  startDateIso: string,
  endDateIso: string,
  access: MetricAccess
): Promise<PrepaidOperationMetricRow[]> {
  const basePath = access === "protected" ? "/api/v1/protected/metrics" : "/api/v1/public/metrics";
  const response = await getJson<{ rows: PrepaidOperationMetricRow[] }>(
    `${basePath}?dataset=prepaid-card-activation&mode=rows&customerType=${encodeURIComponent(customerType)}&start=${encodeURIComponent(startDateIso)}&end=${encodeURIComponent(endDateIso)}`
  );

  return response.rows;
}
