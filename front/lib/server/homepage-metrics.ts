import {
  getCanonicalInstitution,
  isLikelyNonBankingInstitution,
  isTenpoInstitution,
} from "@/lib/bank-presentation";
import { formatMoney, formatMonthLabel, formatPercent, getChileTodayIso } from "@/lib/formatters";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type CreditMetricRow = {
  operation_type: "Compras" | "Avance en Efectivo" | "Cargos por Servicio";
  institution_code: string;
  institution_name: string;
  period_month: string;
  real_value_uf: string | null;
  transaction_count: string | null;
  source_dataset_code?: string | null;
};

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
  return `${sign}${formatPercent(value)}`;
}

export async function buildHomepageMetrics() {
  const supabase = getSupabaseAdminClient();
  const today = getChileTodayIso();

  const [{ data: ufRows, error: ufError }, { data: latestRows, error: latestError }] = await Promise.all([
    supabase
      .from("uf_values")
      .select("value, uf_date")
      .lte("uf_date", today)
      .order("uf_date", { ascending: false })
      .limit(1),
    supabase
      .from("bank_credit_card_ops_metrics")
      .select("period_month")
      .eq("operation_type", "Compras")
      .order("period_month", { ascending: false })
      .limit(1),
  ]);

  if (ufError) throw new Error(ufError.message);
  if (latestError) throw new Error(latestError.message);
  if (!ufRows?.length || !latestRows?.length) {
    throw new Error("Homepage metrics source data unavailable.");
  }

  const ufRow = ufRows[0] as { value: string | number; uf_date: string };
  const latestRow = latestRows[0] as { period_month: string };
  const ufToday = Number(ufRow.value);
  const latestMonth = latestRow.period_month.slice(0, 7);
  const previousYearMonth = addMonths(latestMonth, -12);

  const { data: rows, error: rowsError } = await supabase
    .from("bank_credit_card_ops_metrics")
    .select(
      "operation_type,institution_code,institution_name,period_month,real_value_uf,transaction_count,source_dataset_code"
    )
    .in("operation_type", ["Compras", "Avance en Efectivo", "Cargos por Servicio"])
    .gte("period_month", `${previousYearMonth}-01`)
    .lte("period_month", `${latestMonth}-01`)
    .order("period_month", { ascending: true })
    .order("institution_name", { ascending: true });

  if (rowsError) throw new Error(rowsError.message);

  const metricRows = (rows ?? []) as CreditMetricRow[];
  const purchases = metricRows.filter((row) => row.operation_type === "Compras");

  const byMonthAndBank = new Map<string, { name: string; realUf: number; tx: number }>();
  for (const row of purchases) {
    const nonBanking = isLikelyNonBankingInstitution(
      row.institution_name,
      row.institution_code,
      row.source_dataset_code ?? undefined
    );
    if (nonBanking && !isTenpoInstitution(row.institution_name)) continue;

    const canonical = getCanonicalInstitution(row.institution_name, row.institution_code);
    const month = row.period_month.slice(0, 7);
    const key = `${month}__${canonical.institutionCode}`;
    const current = byMonthAndBank.get(key) ?? { name: canonical.institutionName, realUf: 0, tx: 0 };
    current.realUf += Number(row.real_value_uf ?? 0);
    current.tx += Number(row.transaction_count ?? 0);
    byMonthAndBank.set(key, current);
  }

  const heroBars = Array.from(byMonthAndBank.entries())
    .filter(([key]) => key.startsWith(`${latestMonth}__`))
    .map(([key, latest]) => {
      const bankCode = key.split("__")[1];
      const previous = byMonthAndBank.get(`${previousYearMonth}__${bankCode}`);
      const latestAvg = latest.tx > 0 ? (latest.realUf * ufToday * 1_000_000) / latest.tx : 0;
      const previousAvg =
        previous && previous.tx > 0 ? (previous.realUf * ufToday * 1_000_000) / previous.tx : null;
      const growth = previousAvg && previousAvg > 0 ? ((latestAvg - previousAvg) / previousAvg) * 100 : null;
      return {
        name: latest.name,
        value: Math.round(latestAvg),
        growth: toSignedPercent(growth),
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  function totalByMonth(
    operation: "Compras" | "Avance en Efectivo" | "Cargos por Servicio",
    month: string
  ) {
    return metricRows.reduce((sum, row) => {
      if (row.operation_type !== operation || row.period_month.slice(0, 7) !== month) return sum;
      return sum + Number(row.real_value_uf ?? 0) * ufToday;
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
    heroMonthLabel: formatMonthLabel(latestMonth),
    heroBars,
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
