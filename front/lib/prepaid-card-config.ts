export const prepaidCustomerTypes = [
  { slug: "natural-person", label: "Natural Person", customerType: "Natural Person" },
  { slug: "business", label: "Business", customerType: "Business" },
] as const;

export const prepaidCardOperations = [
  { slug: "purchases", label: "Purchases", operation: "Purchases" },
  { slug: "utilities", label: "Utilities", operation: "Utilities" },
  { slug: "atm-withdrawals", label: "ATM Withdrawals", operation: "ATM Withdrawals" },
  {
    slug: "total-activation-rate",
    label: "Operation Metrics",
    operation: "Total Activation Rate",
  },
] as const;

export type PrepaidCustomerType = (typeof prepaidCustomerTypes)[number]["customerType"];
export type PrepaidCustomerTypeSlug = (typeof prepaidCustomerTypes)[number]["slug"];
export type PrepaidOperationName = (typeof prepaidCardOperations)[number]["operation"];

export const prepaidOperationLabelMap: Record<PrepaidOperationName, string> = {
  Purchases: "Purchases",
  Utilities: "Utilities",
  "ATM Withdrawals": "ATM Withdrawals",
  "Total Activation Rate": "Operation Metrics",
};

export function operationFromSlug(slug: string): PrepaidOperationName | null {
  const match = prepaidCardOperations.find((item) => item.slug === slug);
  return match?.operation ?? null;
}

export function customerTypeFromSlug(slug: string): PrepaidCustomerType | null {
  const match = prepaidCustomerTypes.find((item) => item.slug === slug);
  return match?.customerType ?? null;
}

export function slugFromCustomerType(customerType: PrepaidCustomerType): PrepaidCustomerTypeSlug {
  const match = prepaidCustomerTypes.find((item) => item.customerType === customerType);
  return match?.slug ?? "natural-person";
}

export const prepaidChartViews = [
  {
    key: "volume",
    label: "Volume",
    metricType: "money" as const,
    description: "Monthly prepaid-card volume for the selected operation.",
    unitLabel: "Millions of CLP. Values are deflated using UF.",
  },
  {
    key: "transactions",
    label: "Transactions",
    metricType: "count" as const,
    description: "Monthly number of operations for the selected prepaid category.",
    unitLabel: "Number of Operations",
  },
  {
    key: "average-ticket",
    label: "Avg. Transaction",
    metricType: "money" as const,
    description: "Average CLP amount per transaction for the selected prepaid category.",
    unitLabel: "CLP. Values are deflated using UF.",
  },
  {
    key: "operations-per-active-card",
    label: "Operations per Active Card",
    metricType: "decimal" as const,
    description: "Transactions per active prepaid card.",
    unitLabel: "Number of Operations",
  },
] as const;

export const prepaidOperationMetricsViews = [
  {
    key: "total-active-cards",
    label: "Total Active Cards",
    metricType: "count" as const,
    description: "Active prepaid cards per issuer and month.",
    unitLabel: "Number of active cards (#).",
  },
  {
    key: "total-cards-with-operations",
    label: "Total Cards with Operations",
    metricType: "count" as const,
    description: "Prepaid cards that registered at least one operation in the month.",
    unitLabel: "Number of cards with operations (#).",
  },
  {
    key: "total-activation-rate",
    label: "Total Activation Rate",
    metricType: "ratio" as const,
    description: "Share of active cards that recorded operations in the month.",
    unitLabel: "Percentage of active cards.",
  },
] as const;

export type PrepaidChartViewKey = (typeof prepaidChartViews)[number]["key"];
export type PrepaidOperationMetricsViewKey = (typeof prepaidOperationMetricsViews)[number]["key"];

const prepaidChartViewByKey = Object.fromEntries(prepaidChartViews.map((item) => [item.key, item])) as Record<
  PrepaidChartViewKey,
  (typeof prepaidChartViews)[number]
>;

const prepaidOperationMetricsViewByKey = Object.fromEntries(
  prepaidOperationMetricsViews.map((item) => [item.key, item])
) as Record<PrepaidOperationMetricsViewKey, (typeof prepaidOperationMetricsViews)[number]>;

export const defaultPrepaidViewKey: PrepaidChartViewKey = "volume";
export const defaultPrepaidOperationsRateViewKey: PrepaidOperationMetricsViewKey = "total-active-cards";

export function isPrepaidChartViewKey(value: string | undefined): value is PrepaidChartViewKey {
  return Boolean(value && value in prepaidChartViewByKey);
}

export function isPrepaidOperationsRateViewKey(value: string | undefined): value is PrepaidOperationMetricsViewKey {
  return Boolean(value && value in prepaidOperationMetricsViewByKey);
}

export function isPrepaidOperationsRateOperation(operation: PrepaidOperationName): operation is "Total Activation Rate" {
  return operation === "Total Activation Rate";
}
