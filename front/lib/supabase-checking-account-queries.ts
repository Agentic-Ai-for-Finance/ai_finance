import type { CheckingAccountOperationName } from "@/lib/checking-account-config";
import { getJson } from "@/lib/api-client";
import type { MetricAccess } from "@/lib/supabase-queries";

export type CheckingAccountMetricRow = {
  account_type: CheckingAccountOperationName;
  dataset_code: string;
  institution_code: string;
  institution_name: string;
  period_month: string;
  account_count: string;
  nominal_balance_millions_clp?: string | null;
  uf_date_used?: string | null;
  uf_value_used?: string | null;
  real_balance_uf?: string | null;
  average_balance_uf?: string | null;
  source_dataset_code: string;
  updated_at: string;
};

export async function fetchCheckingAccountDatasetBoundary(
  operation: CheckingAccountOperationName,
  boundary: "latest" | "earliest"
): Promise<string | null> {
  const response = await getJson<{ periodMonth: string | null }>(
    `/api/v1/public/metrics?dataset=checking-accounts&mode=boundary&operation=${encodeURIComponent(operation)}&boundary=${boundary}`
  );

  return response.periodMonth;
}

export async function fetchCheckingAccountMetrics(
  operation: CheckingAccountOperationName,
  startDateIso: string,
  endDateIso: string,
  access: MetricAccess
): Promise<CheckingAccountMetricRow[]> {
  const basePath = access === "protected" ? "/api/v1/protected/metrics" : "/api/v1/public/metrics";
  const response = await getJson<{ rows: CheckingAccountMetricRow[] }>(
    `${basePath}?dataset=checking-accounts&mode=rows&operation=${encodeURIComponent(operation)}&start=${encodeURIComponent(startDateIso)}&end=${encodeURIComponent(endDateIso)}`
  );

  return response.rows;
}
