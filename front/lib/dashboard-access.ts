import type { CheckingAccountChartViewKey } from "@/lib/checking-account-config";
import type { ChartViewKey, OperationName, OperationsRateViewKey } from "@/lib/credit-card-config";
import type { DebitChartViewKey, DebitOperationMetricsViewKey, DebitOperationName } from "@/lib/debit-card-config";
import type {
  PrepaidChartViewKey,
  PrepaidOperationMetricsViewKey,
  PrepaidOperationName,
} from "@/lib/prepaid-card-config";

export function requiresProtectedCreditCardMetric(
  operation: OperationName,
  viewKey: ChartViewKey | OperationsRateViewKey
) {
  if (operation === "Total Activation Rate") {
    return !["total-active-cards", "total-cards-with-operations"].includes(viewKey);
  }

  return !["volume", "transactions"].includes(viewKey);
}

export function requiresProtectedDebitMetric(
  operation: DebitOperationName,
  viewKey: DebitChartViewKey | DebitOperationMetricsViewKey
) {
  if (operation === "Total Activation Rate") {
    return !["total-active-cards", "total-cards-with-operations"].includes(viewKey);
  }

  return !["volume", "transactions"].includes(viewKey);
}

export function requiresProtectedPrepaidMetric(
  operation: PrepaidOperationName,
  viewKey: PrepaidChartViewKey | PrepaidOperationMetricsViewKey
) {
  if (operation === "Total Activation Rate") {
    return !["total-active-cards", "total-cards-with-operations"].includes(viewKey);
  }

  return !["volume", "transactions"].includes(viewKey);
}

export function requiresProtectedCheckingMetric(viewKey: CheckingAccountChartViewKey) {
  return viewKey === "average-balance";
}
