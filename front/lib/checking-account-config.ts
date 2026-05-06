export const checkingAccountOperations = [
  {
    slug: "personas-naturales-sin-intereses",
    label: "Natural Person Without Interest",
    operation: "Natural Person Without Interest",
  },
  {
    slug: "personas-naturales-con-intereses",
    label: "Natural Person With Interest",
    operation: "Natural Person With Interest",
  },
  {
    slug: "personas-juridicas-sin-intereses",
    label: "Business Without Interest",
    operation: "Business Without Interest",
  },
  {
    slug: "personas-juridicas-con-intereses",
    label: "Business With Interest",
    operation: "Business With Interest",
  },
] as const;

export type CheckingAccountOperationName = (typeof checkingAccountOperations)[number]["operation"];

export function operationFromSlug(slug: string): CheckingAccountOperationName | null {
  const match = checkingAccountOperations.find((item) => item.slug === slug);
  return match?.operation ?? null;
}

export const checkingAccountChartViews = [
  {
    key: "volume",
    label: "Volume",
    metricType: "money" as const,
    description: "Monthly checking-account volume for the selected category.",
    unitLabel: "Millions of CLP. Values are deflated using UF.",
  },
  {
    key: "number-of-accounts",
    label: "Number of Accounts",
    metricType: "count" as const,
    description: "Monthly number of checking accounts for the selected category.",
    unitLabel: "Number of Accounts",
  },
  {
    key: "average-balance",
    label: "Average Balance",
    metricType: "money" as const,
    description: "Average CLP balance per account for the selected category.",
    unitLabel: "CLP. Values are deflated using UF.",
  },
] as const;

export const checkingAccountOperationLabelMap: Record<CheckingAccountOperationName, string> = {
  "Natural Person Without Interest": "Natural Person Without Interest",
  "Natural Person With Interest": "Natural Person With Interest",
  "Business Without Interest": "Business Without Interest",
  "Business With Interest": "Business With Interest",
};

export type CheckingAccountChartViewKey = (typeof checkingAccountChartViews)[number]["key"];

const checkingAccountChartViewByKey = Object.fromEntries(
  checkingAccountChartViews.map((item) => [item.key, item])
) as Record<CheckingAccountChartViewKey, (typeof checkingAccountChartViews)[number]>;

export const defaultCheckingAccountViewKey: CheckingAccountChartViewKey = "volume";

export function isCheckingAccountChartViewKey(
  value: string | undefined
): value is CheckingAccountChartViewKey {
  return Boolean(value && value in checkingAccountChartViewByKey);
}
