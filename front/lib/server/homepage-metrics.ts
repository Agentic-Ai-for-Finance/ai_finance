import { formatMoney, formatMonthLabel } from "@/lib/formatters";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type CreditMetricRow = {
  operation_type: "Compras" | "Avance en Efectivo" | "Cargos por Servicio";
  period_month: string;
  nominal_volume_millions_clp: string | null;
};

const HERO_MOCK_BANKS = [
  { name: "Bank 1", value: 98120, growth: "+7,2%" },
  { name: "Bank 2", value: 90450, growth: "+5,9%" },
  { name: "Bank 3", value: 86210, growth: "+4,8%" },
  { name: "Bank 4", value: 80170, growth: "+4,1%" },
  { name: "Bank 5", value: 74430, growth: "+3,7%" },
  { name: "Bank 6", value: 68910, growth: "+3,1%" },
  { name: "Bank 7", value: 64080, growth: "+2,8%" },
  { name: "Bank 8", value: 59200, growth: "+2,1%" },
  { name: "Bank 9", value: 55870, growth: "+1,7%" },
  { name: "Bank 10", value: 52110, growth: "+1,2%" },
] as const;

function addMonths(yearMonth: string, diff: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + diff, 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

function toSignedPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  const sign = value >= 0 ? "+" : "";
  const normalized = Number(value.toFixed(1)).toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${sign}${normalized}%`;
}

export async function buildHomepageMetrics() {
  const supabase = getSupabaseAdminClient();

  const { data: latestRows, error: latestError } = await supabase
    .from("bank_credit_card_ops_metrics")
    .select("period_month")
    .eq("operation_type", "Compras")
    .order("period_month", { ascending: false })
    .limit(1);

  if (latestError) throw new Error(latestError.message);
  if (!latestRows?.length) {
    throw new Error("Homepage metrics source data unavailable.");
  }

  const latestRow = latestRows[0] as { period_month: string };
  const latestMonth = latestRow.period_month.slice(0, 7);
  const previousYearMonth = addMonths(latestMonth, -12);

  const { data: rows, error: rowsError } = await supabase
    .from("bank_credit_card_ops_metrics")
    .select("operation_type,period_month,nominal_volume_millions_clp")
    .in("operation_type", ["Compras", "Avance en Efectivo", "Cargos por Servicio"])
    .gte("period_month", `${previousYearMonth}-01`)
    .lte("period_month", `${latestMonth}-01`);

  if (rowsError) throw new Error(rowsError.message);

  const metricRows = (rows ?? []) as CreditMetricRow[];

  function totalByMonth(
    operation: "Compras" | "Avance en Efectivo" | "Cargos por Servicio",
    month: string
  ) {
    return metricRows.reduce((sum, row) => {
      if (row.operation_type !== operation || row.period_month.slice(0, 7) !== month) return sum;
      return sum + Number(row.nominal_volume_millions_clp ?? 0);
    }, 0);
  }

  const purchasesLatest = totalByMonth("Compras", latestMonth);
  const purchasesPrev = totalByMonth("Compras", previousYearMonth);
  const advancesLatest = totalByMonth("Avance en Efectivo", latestMonth);
  const advancesPrev = totalByMonth("Avance en Efectivo", previousYearMonth);
  const feesLatest = totalByMonth("Cargos por Servicio", latestMonth);
  const feesPrev = totalByMonth("Cargos por Servicio", previousYearMonth);

  const growth = (latest: number, previous: number) =>
    previous > 0 ? ((latest - previous) / previous) * 100 : null;

  return {
    heroMonthLabel: `${formatMonthLabel(latestMonth)} (Mock)`,
    heroBars: HERO_MOCK_BANKS.map((row) => ({ ...row })),
    livePulseMonthLabel: `Latest month: ${formatMonthLabel(latestMonth)}`,
    livePulseCases: [
      {
        product: "Credit Cards / Purchases",
        volume: `$${formatMoney(purchasesLatest)} MM CLP`,
        growth: toSignedPercent(growth(purchasesLatest, purchasesPrev)),
      },
      {
        product: "Credit Cards / Cash Advances",
        volume: `$${formatMoney(advancesLatest)} MM CLP`,
        growth: toSignedPercent(growth(advancesLatest, advancesPrev)),
      },
      {
        product: "Credit Cards / Fees",
        volume: `$${formatMoney(feesLatest)} MM CLP`,
        growth: toSignedPercent(growth(feesLatest, feesPrev)),
      },
    ],
  };
}
