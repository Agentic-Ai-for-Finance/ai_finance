"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type BankSummary = {
  name: string;
  value: number | null;
  growthPct: number | null;
  marketSharePct: number | null;
};

export type DashboardContext = {
  section: string;
  sectionLabel: string;
  operation: string;
  operationLabel: string;
  view: string;
  viewLabel: string;
  startMonth: string;
  endMonth: string;
  selectedBanks: { code: string; name: string }[];
  bankSummaries: BankSummary[];
};

type SearchContextValue = {
  dashboard: DashboardContext | null;
  setDashboard: (ctx: DashboardContext | null) => void;
};

const SearchContext = createContext<SearchContextValue>({
  dashboard: null,
  setDashboard: () => {},
});

export function SearchContextProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<DashboardContext | null>(null);
  const value = useMemo(() => ({ dashboard, setDashboard }), [dashboard]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchContext() {
  return useContext(SearchContext).dashboard;
}

export function useSetSearchContext(ctx: DashboardContext | null) {
  const { setDashboard } = useContext(SearchContext);

  const serialized = ctx
    ? `${ctx.section}|${ctx.operation}|${ctx.view}|${ctx.startMonth}|${ctx.endMonth}|${ctx.selectedBanks.map((b) => b.code).join(",")}|${ctx.bankSummaries.length}`
    : null;

  useEffect(() => {
    setDashboard(ctx);
    return () => setDashboard(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, setDashboard]);
}

const SECTION_LABELS: Record<string, string> = {
  "credit-cards": "Credit Cards",
  "debit-cards": "Debit Cards",
  "prepaid-cards": "Prepaid Cards",
  "checking-accounts": "Checking Accounts",
};

const SECTION_LABELS_ES: Record<string, string> = {
  "credit-cards": "tarjetas de crédito",
  "debit-cards": "tarjetas de débito",
  "prepaid-cards": "tarjetas prepago",
  "checking-accounts": "cuentas corrientes",
};

const OPERATION_LABELS_ES: Record<string, string> = {
  Purchases: "compras",
  "Cash Advances": "avance en efectivo",
  Fees: "cargos por servicio",
  "Operation Metrics": "métricas de activación",
  "Debit Transactions": "transacciones de débito",
  "ATM Withdrawals": "retiros en cajeros automáticos",
  Utilities: "pagos de servicios",
  "Natural Person Without Interest": "personas naturales sin intereses",
  "Natural Person With Interest": "personas naturales con intereses",
  "Business Without Interest": "personas jurídicas sin intereses",
  "Business With Interest": "personas jurídicas con intereses",
};

const VIEW_LABELS_ES: Record<string, string> = {
  Volume: "volumen",
  Transactions: "transacciones",
  "Avg. Transaction": "ticket promedio",
  "Operations per Active Card": "operaciones por tarjeta activa",
  "Total Active Cards": "total tarjetas activas",
  "Total Cards with Operations": "total tarjetas con operaciones",
  "Total Activation Rate": "tasa de activación total",
  "Number of Accounts": "número de cuentas",
  "Average Balance": "saldo promedio",
};

export function getSectionLabel(section: string): string {
  return SECTION_LABELS[section] ?? section;
}

export function buildSpanishQuery(ctx: DashboardContext): string {
  const section = SECTION_LABELS_ES[ctx.section] ?? ctx.sectionLabel;
  const operation = OPERATION_LABELS_ES[ctx.operationLabel] ?? ctx.operationLabel;
  const view = VIEW_LABELS_ES[ctx.viewLabel] ?? ctx.viewLabel;
  const banks = ctx.selectedBanks.map((b) => b.name).join(", ");

  const parts = [section, operation, view];
  if (banks) parts.push(banks);

  return parts.join(" ");
}

export function formatContextTag(ctx: DashboardContext): string {
  const start = formatMonthShort(ctx.startMonth);
  const end = formatMonthShort(ctx.endMonth);
  const bankCount = ctx.selectedBanks.length;
  const bankSuffix = bankCount > 0 ? ` · ${bankCount} bank${bankCount !== 1 ? "s" : ""}` : "";

  return `${ctx.sectionLabel} · ${ctx.operationLabel} · ${ctx.viewLabel} · ${start}–${end}${bankSuffix}`;
}

function formatMonthShort(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  return `${month}/${year?.slice(2)}`;
}
