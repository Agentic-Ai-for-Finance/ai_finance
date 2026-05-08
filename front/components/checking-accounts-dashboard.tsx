"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BankSelector } from "@/components/bank-selector";
import { EmptyState, ErrorState, LoadingState, LockedMetricState } from "@/components/dashboard-states";
import { MetricLineChart } from "@/components/metric-line-chart";
import { useOptionalAuth } from "@/lib/clerk-compat";
import {
  getBankDisplayName,
  getCanonicalInstitution,
  shouldIncludeInstitution,
} from "@/lib/bank-presentation";
import {
  checkingAccountChartViews,
  checkingAccountOperationLabelMap,
  defaultCheckingAccountViewKey,
  isCheckingAccountChartViewKey,
  type CheckingAccountChartViewKey,
  type CheckingAccountOperationName,
} from "@/lib/checking-account-config";
import { requiresProtectedCheckingMetric } from "@/lib/dashboard-access";
import {
  addMonths,
  buildMonthOptions,
  calculateMarketShares,
  formatMoney,
  formatMoneyWithSymbol,
  formatMonthLabel,
  formatPercent,
  getChileTodayIso,
  normalizeMonthValue,
  parseMonthValue,
} from "@/lib/formatters";
import {
  type CheckingAccountMetricRow,
  fetchCheckingAccountDatasetBoundary,
  fetchCheckingAccountMetrics,
} from "@/lib/supabase-checking-account-queries";
import { fetchLatestUfValue } from "@/lib/supabase-queries";
import { useSavedBankPreferences } from "@/lib/user-bank-preferences";
import { cn } from "@/lib/utils";

type CheckingAccountsDashboardProps = {
  operation: CheckingAccountOperationName;
  initialView?: string;
  startMonthParam?: string;
  endMonthParam?: string;
  ufParam?: string;
};

type BoundaryState = {
  earliestMonth: string;
  latestMonth: string;
  defaultUfValue: number | null;
};

type SummaryRow = {
  institutionCode: string;
  institutionName: string;
  currentValue: number | null;
  metricGrowthPct: number | null;
  marketShareEnd: number | null;
  marketShareGrowthPp: number | null;
};

export function CheckingAccountsDashboard({
  operation,
  initialView,
  startMonthParam,
  endMonthParam,
  ufParam,
}: CheckingAccountsDashboardProps) {
  const { isSignedIn } = useOptionalAuth();
  const initialMetricKey = isCheckingAccountChartViewKey(initialView)
    ? initialView
    : defaultCheckingAccountViewKey;

  const [viewKey, setViewKey] = useState<CheckingAccountChartViewKey>(initialMetricKey);
  const [boundaryState, setBoundaryState] = useState<BoundaryState | null>(null);
  const [rows, setRows] = useState<CheckingAccountMetricRow[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [isLoadingBounds, setIsLoadingBounds] = useState(true);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasSeededSelectionRef = useRef(false);
  const { defaultInstitutionCodes } = useSavedBankPreferences("checking-accounts");
  const requiresProtectedMetric = requiresProtectedCheckingMetric(viewKey);
  const isMetricLocked = requiresProtectedMetric && !isSignedIn;

  useEffect(() => {
    setViewKey(isCheckingAccountChartViewKey(initialView) ? initialView : defaultCheckingAccountViewKey);
  }, [initialView]);

  useEffect(() => {
    let isCancelled = false;

    async function loadBoundaries() {
      setIsLoadingBounds(true);
      setErrorMessage(null);
      setRows([]);
      try {
        const chileToday = getChileTodayIso();
        const [latestMonth, earliestMonth, latestUf] = await Promise.all([
          fetchCheckingAccountDatasetBoundary(operation, "latest"),
          fetchCheckingAccountDatasetBoundary(operation, "earliest"),
          fetchLatestUfValue(chileToday),
        ]);

        if (!latestMonth || !earliestMonth) {
          throw new Error("No checking-account data is available for this operation.");
        }

        if (!isCancelled) {
          setBoundaryState({
            earliestMonth: earliestMonth.slice(0, 7),
            latestMonth: latestMonth.slice(0, 7),
            defaultUfValue: latestUf.value,
          });
          hasSeededSelectionRef.current = false;
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load dashboard metadata.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingBounds(false);
        }
      }
    }

    void loadBoundaries();
    return () => {
      isCancelled = true;
    };
  }, [operation]);

  const { startMonth, endMonth } = useMemo(() => {
    if (!boundaryState) {
      return { startMonth: "", endMonth: "" };
    }

    const { earliestMonth, latestMonth } = boundaryState;
    const defaultStart = normalizeMonthValue(
      addMonths(parseMonthValue(latestMonth), -12).toISOString().slice(0, 7)
    );
    const rawStart =
      startMonthParam && /^\d{4}-\d{2}$/.test(startMonthParam)
        ? normalizeMonthValue(startMonthParam)
        : defaultStart;
    const rawEnd =
      endMonthParam && /^\d{4}-\d{2}$/.test(endMonthParam)
        ? normalizeMonthValue(endMonthParam)
        : latestMonth;
    const safeStart = rawStart > latestMonth ? latestMonth : rawStart;
    const safeEnd = rawEnd < earliestMonth ? earliestMonth : rawEnd > latestMonth ? latestMonth : rawEnd;
    const normalizedStart = safeStart > safeEnd ? safeEnd : safeStart;
    const normalizedEnd = safeEnd < normalizedStart ? normalizedStart : safeEnd;

    return { startMonth: normalizedStart, endMonth: normalizedEnd };
  }, [boundaryState, endMonthParam, startMonthParam]);

  useEffect(() => {
    if (!startMonth || !endMonth) {
      return;
    }

    let isCancelled = false;

    async function loadRows() {
      if (isMetricLocked) {
        setRows([]);
        setIsLoadingRows(false);
        setErrorMessage(null);
        return;
      }

      setIsLoadingRows(true);
      setErrorMessage(null);
      try {
        const nextRows = await fetchCheckingAccountMetrics(
          operation,
          `${startMonth}-01`,
          `${endMonth}-01`,
          requiresProtectedMetric ? "protected" : "public"
        );
        if (!nextRows.length) {
          throw new Error("The selected time range returned no rows.");
        }
        if (!isCancelled) {
          setRows(nextRows);
        }
      } catch (error) {
        if (!isCancelled) {
          setRows([]);
          setErrorMessage(error instanceof Error ? error.message : "Unable to load checking-account metrics.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingRows(false);
        }
      }
    }

    void loadRows();
    return () => {
      isCancelled = true;
    };
  }, [endMonth, isMetricLocked, operation, requiresProtectedMetric, startMonth]);

  const activeUfValue = useMemo(() => {
    const parsed = Number(ufParam ?? "");
    return Number.isFinite(parsed) && parsed > 0 ? parsed : boundaryState?.defaultUfValue ?? 0;
  }, [boundaryState?.defaultUfValue, ufParam]);

  const months = useMemo(() => buildMonthOptions(startMonth, endMonth), [startMonth, endMonth]);
  const activeMetric = checkingAccountChartViews.find((item) => item.key === viewKey) ?? checkingAccountChartViews[0];

  const filteredRows = useMemo(
    () => rows.filter((row) => shouldIncludeInstitution(row.institution_name, row.institution_code, row.source_dataset_code)),
    [rows]
  );

  const mergedRows = useMemo(() => aggregateRows(filteredRows), [filteredRows]);

  const loadedMonthKeys = useMemo(
    () => Array.from(new Set(mergedRows.map((row) => row.period_month.slice(0, 7)))).sort(),
    [mergedRows]
  );
  const latestLoadedMonth = loadedMonthKeys.at(-1) ?? null;

  const bankSeries = useMemo(() => {
    const grouped = new Map<string, Record<string, number | null>>();
    const bankNames = new Map<string, string>();

    mergedRows.forEach((row) => {
      const monthKey = row.period_month.slice(0, 7);
      const metricValue = getMetricValue(row, viewKey, activeUfValue);
      const canonical = getCanonicalInstitution(row.institution_name, row.institution_code);

      const bankMonths =
        grouped.get(canonical.institutionCode) ??
        (Object.fromEntries(months.map((month) => [month, null])) as Record<string, number | null>);
      bankMonths[monthKey] = metricValue;
      grouped.set(canonical.institutionCode, bankMonths);
      bankNames.set(canonical.institutionCode, canonical.institutionName);
    });

    return Array.from(grouped.entries())
      .map(([institutionCode, series]) => ({
        institutionCode,
        institutionName: bankNames.get(institutionCode) ?? institutionCode,
        series,
      }))
      .sort((left, right) => left.institutionName.localeCompare(right.institutionName));
  }, [activeUfValue, mergedRows, months, viewKey]);

  const defaultSelectedBanks = useMemo(
    () =>
      defaultInstitutionCodes.length
        ? bankSeries
            .filter((bank) => defaultInstitutionCodes.includes(bank.institutionCode))
            .map((bank) => bank.institutionCode)
        : computeDefaultSelectedBanks(bankSeries, latestLoadedMonth),
    [bankSeries, defaultInstitutionCodes, latestLoadedMonth]
  );

  useEffect(() => {
    if (!bankSeries.length) {
      setSelectedBanks([]);
      hasSeededSelectionRef.current = false;
      return;
    }

    setSelectedBanks((current) => {
      const availableCodes = new Set(bankSeries.map((bank) => bank.institutionCode));
      const filtered = current.filter((code) => availableCodes.has(code));
      if (filtered.length) {
        return filtered;
      }
      return defaultSelectedBanks;
    });
  }, [bankSeries, defaultSelectedBanks]);

  const selectedSeries = useMemo(
    () => bankSeries.filter((bank) => selectedBanks.includes(bank.institutionCode)),
    [bankSeries, selectedBanks]
  );

  const systemMonthTotals = useMemo(
    () =>
      Object.fromEntries(
        months.map((month) => [
          month,
          bankSeries.reduce((sum, bank) => {
            const value = bank.series[month];
            return typeof value === "number" ? sum + value : sum;
          }, 0),
        ])
      ) as Record<string, number>,
    [bankSeries, months]
  );

  const latestMonthRows = useMemo(
    () => mergedRows.filter((row) => latestLoadedMonth !== null && row.period_month.slice(0, 7) === latestLoadedMonth),
    [latestLoadedMonth, mergedRows]
  );
  const firstMonthRows = useMemo(
    () => mergedRows.filter((row) => row.period_month.slice(0, 7) === startMonth),
    [mergedRows, startMonth]
  );

  const supportsMarketShare = viewKey === "volume" || viewKey === "number-of-accounts";

  const summaryRows = useMemo(() => {
    const bankMap = new Map(selectedSeries.map((bank) => [bank.institutionCode, bank.institutionName] as const));
    const latestRowsByCode = new Map(
      latestMonthRows.map((row) => {
        const canonical = getCanonicalInstitution(row.institution_name, row.institution_code);
        return [canonical.institutionCode, row] as const;
      })
    );
    const firstRowsByCode = new Map(
      firstMonthRows.map((row) => {
        const canonical = getCanonicalInstitution(row.institution_name, row.institution_code);
        return [canonical.institutionCode, row] as const;
      })
    );

    const selectedRows: SummaryRow[] = selectedBanks
      .map((institutionCode) => {
        const row = latestRowsByCode.get(institutionCode);
        if (!row) {
          return null;
        }
        const currentValue = getMetricValue(row, viewKey, activeUfValue);
        const startRow = firstRowsByCode.get(institutionCode);
        const startValue = startRow ? getMetricValue(startRow, viewKey, activeUfValue) : null;

        let shareEnd: number | null = null;
        let shareStart: number | null = null;
        if (supportsMarketShare) {
          const totalLatest = calculateSystemTotal(latestMonthRows, viewKey, activeUfValue);
          const totalStart = calculateSystemTotal(firstMonthRows, viewKey, activeUfValue);
          shareEnd = calculateMarketShares(currentValue ?? 0, totalLatest);
          if (!startRow) {
            shareStart = 0;
          } else if (startValue !== null) {
            shareStart = calculateMarketShares(startValue, totalStart);
          }
        }

        return {
          institutionCode,
          institutionName: bankMap.get(institutionCode) ?? getBankDisplayName(row.institution_name),
          currentValue,
          metricGrowthPct: !startRow || startMonth === latestLoadedMonth ? null : calculateVsStart(startValue, currentValue, false),
          marketShareEnd: shareEnd,
          marketShareGrowthPp:
            shareEnd === null || shareStart === null || startMonth === latestLoadedMonth
              ? null
              : shareEnd - shareStart,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => {
        if (left.currentValue === null && right.currentValue === null) {
          return 0;
        }
        if (left.currentValue === null) {
          return 1;
        }
        if (right.currentValue === null) {
          return -1;
        }
        return right.currentValue - left.currentValue;
      });

    if (viewKey === "average-balance") {
      const systemCurrentValue = calculateSystemAverage(latestMonthRows, activeUfValue);
      const systemStartValue = calculateSystemAverage(firstMonthRows, activeUfValue);
      return systemCurrentValue === null
        ? selectedRows
        : [
            {
              institutionCode: "total",
              institutionName: "System",
              currentValue: systemCurrentValue,
              metricGrowthPct: calculateVsStart(systemStartValue, systemCurrentValue, startMonth === latestLoadedMonth),
              marketShareEnd: null,
              marketShareGrowthPp: null,
            },
            ...selectedRows,
          ];
    }

    const totalValue = calculateSystemTotal(latestMonthRows, viewKey, activeUfValue);
    const selectedTotal = selectedRows.reduce((accumulator, row) => accumulator + (row.currentValue ?? 0), 0);
    const othersValue = Math.max(totalValue - selectedTotal, 0);
    const systemStartTotal = calculateSystemTotal(firstMonthRows, viewKey, activeUfValue);
    const selectedStartTotal = selectedBanks.reduce((accumulator, institutionCode) => {
      const startRow = firstRowsByCode.get(institutionCode);
      if (!startRow) {
        return accumulator;
      }
      const startValue = getMetricValue(startRow, viewKey, activeUfValue);
      return accumulator + (startValue ?? 0);
    }, 0);
    const othersStartValue = Math.max(systemStartTotal - selectedStartTotal, 0);

    return [
      {
        institutionCode: "total",
        institutionName: "System",
        currentValue: totalValue,
        metricGrowthPct: calculateVsStart(systemStartTotal, totalValue, startMonth === latestLoadedMonth),
        marketShareEnd: supportsMarketShare ? 100 : null,
        marketShareGrowthPp: supportsMarketShare && startMonth !== latestLoadedMonth ? 0 : null,
      },
      ...selectedRows,
      ...(supportsMarketShare
        ? [
            {
              institutionCode: "others",
              institutionName: "Others",
              currentValue: othersValue,
              metricGrowthPct: calculateVsStart(othersStartValue, othersValue, startMonth === latestLoadedMonth),
              marketShareEnd: calculateMarketShares(othersValue, totalValue),
              marketShareGrowthPp:
                startMonth === latestLoadedMonth
                  ? null
                  : calculateMarketShares(othersValue, totalValue) - calculateMarketShares(othersStartValue, systemStartTotal),
            } satisfies SummaryRow,
          ]
        : []),
    ];
  }, [activeUfValue, firstMonthRows, latestLoadedMonth, latestMonthRows, selectedBanks, selectedSeries, startMonth, supportsMarketShare, viewKey]);

  function handleResetBanks() {
    setSelectedBanks(defaultSelectedBanks);
    hasSeededSelectionRef.current = true;
  }

  if (isLoadingBounds) {
    return <LoadingState label="Loading dashboard configuration" />;
  }

  if (errorMessage && !filteredRows.length) {
    return <ErrorState title="Unable to load the dashboard" description={errorMessage} />;
  }

  if (!boundaryState) {
    return <EmptyState title="No data available" description="No operation metadata was returned." />;
  }

  if (!latestLoadedMonth && !isLoadingRows) {
    return <EmptyState title="No loaded data" description="The selected time range did not return any complete points." />;
  }

  const tableEndMonthLabel = formatMonthLabel(latestLoadedMonth ?? endMonth);
  const tableStartMonthLabel = formatMonthLabel(startMonth);

  return (
    <section className="space-y-8 pt-4 sm:space-y-10 sm:pt-6 lg:pt-8">
      <div className="border-b border-border pb-6 sm:pb-8">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">Chilean banking · monthly series</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:mt-5 sm:text-5xl lg:text-6xl">
            {`${checkingAccountOperationLabelMap[operation]} bank by bank`}
          </h1>
          <p className="mt-4 max-w-none text-sm leading-6 text-muted sm:mt-5 sm:text-base sm:leading-7 lg:text-lg">
            Monthly checking-account analysis across banks with UF-adjusted CLP values for volume and average balance.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="rounded-2xl border border-border bg-panel p-4 sm:rounded-3xl sm:p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-h-[4rem]">
              <h2 className="text-xl font-semibold text-white">{activeMetric.label}</h2>
              <p className="mt-2 min-h-5 text-xs italic text-muted">
                {activeMetric.key === "volume" ? "Millions of CLP" : activeMetric.unitLabel || "\u00A0"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pb-1">
              {checkingAccountChartViews.map((item, index, items) => (
                <MetricTabButton
                  key={item.key}
                  active={viewKey === item.key}
                  tooltipAlign={index === items.length - 1 ? "right" : "center"}
                  label={item.label}
                  description={item.description}
                  unitLabel={item.unitLabel}
                  onClick={() => setViewKey(item.key)}
                />
              ))}
            </div>
          </div>

          {isMetricLocked ? (
            <LockedMetricState compact description={`Login to unlock ${activeMetric.label.toLowerCase()} for ${checkingAccountOperationLabelMap[operation]}.`} />
          ) : isLoadingRows ? (
            <LoadingState label="Loading time series" compact />
          ) : selectedSeries.length ? (
            <MetricLineChart
              months={months}
              systemMonthTotals={systemMonthTotals}
              series={selectedSeries}
              metricType={activeMetric.metricType}
              showSystemShare={viewKey !== "average-balance"}
            />
          ) : (
            <EmptyState
              title="No banks selected"
              description="Select at least one bank to render the line chart for the chosen metric."
              compact
            />
          )}
        </div>

        <BankSelector
          banks={bankSeries.map((bank) => ({
            institutionCode: bank.institutionCode,
            institutionName: bank.institutionName,
          }))}
          selectedBanks={selectedBanks}
          onChange={setSelectedBanks}
          onReset={handleResetBanks}
        />

        <div className="border-t border-border pt-8">
          {isMetricLocked ? (
            <LockedMetricState
              compact
              title={`${activeMetric.label} stays locked while logged out`}
              description="The metric pill remains visible, but the data table unlocks only after sign-in."
            />
          ) : (
            <>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {activeMetric.label} in {latestLoadedMonth ? formatMonthLabel(latestLoadedMonth) : formatMonthLabel(endMonth)}
              </h3>
            </div>
            <p className="text-xs text-muted sm:text-sm">{selectedBanks.length} banks</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[38rem] text-left text-xs sm:min-w-full sm:text-sm">
              <thead>
                <tr className="border-y border-border text-xs font-medium uppercase tracking-[0.24em] text-muted">
                  <th className="py-3 pr-3 sm:py-4 sm:pr-6">Bank</th>
                  <th className="py-3 pr-3 text-center sm:py-4 sm:pr-6">{activeMetric.label}</th>
                  <th className="py-3 pr-3 text-center sm:py-4 sm:pr-6">
                    Growth {activeMetric.label} {tableEndMonthLabel} vs {tableStartMonthLabel}
                  </th>
                  {supportsMarketShare ? (
                    <th className="py-3 pr-3 text-center sm:py-4 sm:pr-6">Market Share {tableEndMonthLabel}</th>
                  ) : null}
                  {supportsMarketShare ? (
                    <th className="py-3 text-center sm:py-4">Market Share {tableEndMonthLabel} vs {tableStartMonthLabel}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr
                    key={row.institutionCode}
                    className={cn("border-b border-border/70", row.institutionCode === "total" && "bg-brand/10")}
                  >
                    <td className={cn("py-4 pr-3 text-white sm:py-5 sm:pr-6", row.institutionCode === "total" ? "font-semibold" : "")}>
                      {row.institutionName}
                    </td>
                    <td className={cn("py-4 pr-3 text-center text-white sm:py-5 sm:pr-6", row.institutionCode === "total" ? "font-semibold" : "")}>
                      {row.currentValue === null ? "—" : formatMetricValue(row.currentValue, activeMetric.metricType)}
                    </td>
                    <td className={cn("py-4 pr-3 text-center text-white sm:py-5 sm:pr-6", row.institutionCode === "total" ? "font-semibold" : "")}>
                      {row.metricGrowthPct === null ? "—" : formatPercent(row.metricGrowthPct)}
                    </td>
                    {supportsMarketShare ? (
                      <td className={cn("py-4 pr-3 text-center text-white sm:py-5 sm:pr-6", row.institutionCode === "total" ? "font-semibold" : "")}>
                        {row.marketShareEnd === null ? "—" : formatPercent(row.marketShareEnd)}
                      </td>
                    ) : null}
                    {supportsMarketShare ? (
                      <td className={cn("py-4 text-center text-white sm:py-5", row.institutionCode === "total" ? "font-semibold" : "")}>
                        {formatShareGrowthWithArrow(row.marketShareGrowthPp)}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </>
          )}
        </div>
      </div>

      {errorMessage && filteredRows.length ? (
        <ErrorState title="Partial data issue" description={errorMessage} compact />
      ) : null}
    </section>
  );
}

function getMetricValue(
  row: CheckingAccountMetricRow,
  viewKey: CheckingAccountChartViewKey,
  activeUfValue: number
): number | null {
  if (viewKey === "volume") {
    return row.real_balance_uf ? Number(row.real_balance_uf) * activeUfValue : null;
  }
  if (viewKey === "number-of-accounts") {
    return Number(row.account_count);
  }
  if (viewKey === "average-balance") {
    return row.average_balance_uf ? Number(row.average_balance_uf) * activeUfValue : null;
  }
  return null;
}

function aggregateRows(rows: CheckingAccountMetricRow[]): CheckingAccountMetricRow[] {
  const grouped = new Map<string, CheckingAccountMetricRow>();

  rows.forEach((row) => {
    const canonical = getCanonicalInstitution(row.institution_name, row.institution_code);
    const monthKey = row.period_month.slice(0, 7);
    const key = `${canonical.institutionCode}:${monthKey}`;
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        ...row,
        institution_code: canonical.institutionCode,
        institution_name: canonical.institutionName,
      });
      return;
    }

    const currentAccounts = Number(existing.account_count) + Number(row.account_count);
    const currentNominal = Number(existing.nominal_balance_millions_clp ?? 0) + Number(row.nominal_balance_millions_clp ?? 0);
    const currentRealUf = Number(existing.real_balance_uf ?? 0) + Number(row.real_balance_uf ?? 0);

    grouped.set(key, {
      ...existing,
      account_count: String(currentAccounts),
      nominal_balance_millions_clp: String(currentNominal),
      real_balance_uf: String(currentRealUf),
      average_balance_uf: currentAccounts > 0 ? String((currentRealUf / currentAccounts) * 1_000_000) : "0",
    });
  });

  return Array.from(grouped.values());
}

function formatMetricValue(value: number, metricType: "money" | "count"): string {
  if (metricType === "money") {
    return formatMoneyWithSymbol(value);
  }
  return formatMoney(value);
}

function formatShareGrowthWithArrow(value: number | null): string {
  if (value === null) {
    return "—";
  }
  if (value > 0) {
    return `${formatPercent(value)} ↑`;
  }
  if (value < 0) {
    return `${formatPercent(value)} ↓`;
  }
  return `${formatPercent(value)} →`;
}

function computeDefaultSelectedBanks(
  bankSeries: Array<{ institutionCode: string; series: Record<string, number | null> }>,
  latestLoadedMonth: string | null
) {
  if (!latestLoadedMonth) {
    return [];
  }
  return bankSeries
    .map((bank) => ({
      institutionCode: bank.institutionCode,
      value: bank.series[latestLoadedMonth],
    }))
    .filter((bank): bank is { institutionCode: string; value: number } => typeof bank.value === "number")
    .sort((left, right) => right.value - left.value)
    .slice(0, 5)
    .map((item) => item.institutionCode);
}

function calculateVsStart(startValue: number | null, currentValue: number | null, sameMonth: boolean) {
  if (sameMonth || startValue === null || startValue === 0 || currentValue === null) {
    return null;
  }
  return ((currentValue - startValue) / startValue) * 100;
}

function calculateSystemAverage(rows: CheckingAccountMetricRow[], activeUfValue: number) {
  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.volume += Number(row.real_balance_uf ?? 0) * activeUfValue;
      accumulator.accounts += Number(row.account_count);
      return accumulator;
    },
    { volume: 0, accounts: 0 }
  );

  return totals.accounts > 0 ? (totals.volume * 1_000_000) / totals.accounts : null;
}

function calculateSystemTotal(
  rows: CheckingAccountMetricRow[],
  viewKey: CheckingAccountChartViewKey,
  activeUfValue: number
) {
  return rows.reduce((total, row) => {
    const nextValue = getMetricValue(row, viewKey, activeUfValue);
    return nextValue === null ? total : total + nextValue;
  }, 0);
}

function MetricTabButton({
  active,
  tooltipAlign,
  label,
  description,
  unitLabel,
  onClick,
}: {
  active: boolean;
  tooltipAlign?: "center" | "right";
  label: string;
  description: string;
  unitLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/tab relative shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-brand/60 bg-brand/10 text-white"
          : "border-border bg-panelMuted text-muted hover:text-white"
      )}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        <span className="group/info relative inline-flex cursor-help">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current/30 text-[10px] font-semibold leading-none text-current transition group-hover/tab:border-brand/60 group-hover/tab:text-white group-focus-visible/tab:border-brand/60 group-focus-visible/tab:text-white">
            i
          </span>
          <span
            className={cn(
              "pointer-events-none absolute bottom-full z-30 mb-2 hidden w-80 max-w-[90vw] whitespace-normal break-words rounded-2xl border border-border bg-[#07101c] p-3 text-left text-xs leading-5 text-muted shadow-2xl group-hover/info:block group-focus-visible/info:block",
              tooltipAlign === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
            )}
          >
            <span className="block text-sm font-semibold text-white">{label}</span>
            <span className="mt-1 block">{description}</span>
            {unitLabel ? <span className="mt-1 block text-xs italic text-brand">{unitLabel}</span> : null}
          </span>
        </span>
      </span>
    </button>
  );
}
