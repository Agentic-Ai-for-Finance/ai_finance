"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  customerTypeFromSlug,
  defaultPrepaidOperationsRateViewKey,
  defaultPrepaidViewKey,
  isPrepaidOperationsRateOperation,
  operationFromSlug,
  prepaidCardOperations,
  prepaidCustomerTypes,
  type PrepaidOperationName,
} from "@/lib/prepaid-card-config";
import { formatMoney, formatMonthLabel, getChileTodayIso, normalizeMonthValue } from "@/lib/formatters";
import { fetchLatestUfValue } from "@/lib/supabase-queries";
import {
  fetchPrepaidDatasetBoundary,
  fetchPrepaidOperationMetricsBoundary,
} from "@/lib/supabase-prepaid-queries";
import { cn } from "@/lib/utils";

type PrepaidCardSidebarProps = {
  activePath?: string;
  queryParams?: Record<string, string | undefined>;
  onNavigate?: () => void;
};

type BoundaryState = {
  earliestMonth: string;
  latestMonth: string;
  defaultUfValue: number | null;
};

function addMonths(month: string, offset: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function monthRegex(month: string | null): month is string {
  return Boolean(month && /^\d{4}-\d{2}$/.test(month));
}

export function PrepaidCardSidebar({
  activePath,
  queryParams = {},
  onNavigate,
}: PrepaidCardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [boundaryState, setBoundaryState] = useState<BoundaryState | null>(null);
  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    return params;
  }, [queryParams]);

  const pathSegments = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const activeCustomerTypeSlug = pathSegments[1] ?? "natural-person";
  const activeOperationSlug = pathSegments[2] ?? activePath ?? "purchases";
  const activeCustomerType = customerTypeFromSlug(activeCustomerTypeSlug);
  const activeOperation = operationFromSlug(activeOperationSlug);
  const isOperationsRateDashboard =
    activeOperation !== null && isPrepaidOperationsRateOperation(activeOperation);

  useEffect(() => {
    let isCancelled = false;

    async function loadBoundaries() {
      if (!activeCustomerType || !activeOperation) {
        setBoundaryState(null);
        return;
      }

      try {
        if (isOperationsRateDashboard) {
          const [latestMonth, earliestMonth] = await Promise.all([
            fetchPrepaidOperationMetricsBoundary(activeCustomerType, "latest"),
            fetchPrepaidOperationMetricsBoundary(activeCustomerType, "earliest"),
          ]);

          if (!latestMonth || !earliestMonth) {
            throw new Error("No prepaid operation-metrics data is available.");
          }

          if (!isCancelled) {
            setBoundaryState({
              earliestMonth: earliestMonth.slice(0, 7),
              latestMonth: latestMonth.slice(0, 7),
              defaultUfValue: null,
            });
          }
          return;
        }

        const chileToday = getChileTodayIso();
        const [latestMonth, earliestMonth, latestUf] = await Promise.all([
          fetchPrepaidDatasetBoundary(
            activeCustomerType,
            activeOperation as Exclude<PrepaidOperationName, "Total Activation Rate">,
            "latest"
          ),
          fetchPrepaidDatasetBoundary(
            activeCustomerType,
            activeOperation as Exclude<PrepaidOperationName, "Total Activation Rate">,
            "earliest"
          ),
          fetchLatestUfValue(chileToday),
        ]);

        if (!latestMonth || !earliestMonth) {
          throw new Error("No prepaid data is available for this route.");
        }

        if (!isCancelled) {
          setBoundaryState({
            earliestMonth: earliestMonth.slice(0, 7),
            latestMonth: latestMonth.slice(0, 7),
            defaultUfValue: latestUf.value,
          });
        }
      } catch {
        if (!isCancelled) {
          setBoundaryState(null);
        }
      }
    }

    void loadBoundaries();
    return () => {
      isCancelled = true;
    };
  }, [activeCustomerType, activeOperation, isOperationsRateDashboard]);

  const persistedParams = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (boundaryState) {
      const earliest = boundaryState.earliestMonth;
      const latest = boundaryState.latestMonth;
      const defaultStart = addMonths(latest, -12) < earliest ? earliest : addMonths(latest, -12);
      const startParam = searchParams.get("start");
      const endParam = searchParams.get("end");
      const baseStart = monthRegex(startParam) ? normalizeMonthValue(startParam) : defaultStart;
      const baseEnd = monthRegex(endParam) ? normalizeMonthValue(endParam) : latest;
      const safeStart = baseStart < earliest ? earliest : baseStart > latest ? latest : baseStart;
      const safeEnd = baseEnd < earliest ? earliest : baseEnd > latest ? latest : baseEnd;
      const normalizedStart = safeStart > safeEnd ? safeEnd : safeStart;
      const normalizedEnd = safeEnd < normalizedStart ? normalizedStart : safeEnd;

      params.set("start", normalizedStart);
      params.set("end", normalizedEnd);

      const ufParam = searchParams.get("uf");
      const ufNumber = ufParam ? Number(ufParam) : NaN;
      const fallbackUf = boundaryState.defaultUfValue ? String(Math.round(boundaryState.defaultUfValue)) : "";
      if (Number.isFinite(ufNumber) && ufNumber > 0) {
        params.set("uf", String(Math.round(ufNumber)));
      } else if (fallbackUf) {
        params.set("uf", fallbackUf);
      }
    }

    if (!params.get("view")) {
      params.set(
        "view",
        isOperationsRateDashboard ? defaultPrepaidOperationsRateViewKey : defaultPrepaidViewKey
      );
    }

    return params;
  }, [boundaryState, isOperationsRateDashboard, searchParams]);

  useEffect(() => {
    if (!boundaryState) {
      return;
    }
    if (persistedParams.toString() !== searchParams.toString()) {
      router.replace(`${pathname}?${persistedParams.toString()}`, { scroll: false });
    }
  }, [boundaryState, pathname, persistedParams, router, searchParams]);

  const availableMonthOptions = useMemo(() => {
    if (!boundaryState) {
      return [];
    }
    const months: string[] = [];
    let cursor = boundaryState.earliestMonth;
    while (cursor <= boundaryState.latestMonth) {
      months.push(cursor);
      cursor = addMonths(cursor, 1);
    }
    return months;
  }, [boundaryState]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(persistedParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const operationHref = (customerTypeSlug: string, operationSlug: string) => {
    const params = new URLSearchParams(persistedParams.toString());
    params.set(
      "view",
      operationSlug === "total-activation-rate"
        ? defaultPrepaidOperationsRateViewKey
        : defaultPrepaidViewKey
    );
    return `/prepaid-cards/${customerTypeSlug}/${operationSlug}?${params.toString()}`;
  };

  const startMonth = persistedParams.get("start") ?? "";
  const endMonth = persistedParams.get("end") ?? "";
  const ufValue = persistedParams.get("uf") ?? "";

  return (
    <div className="py-2">
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Prepaid Cards
        </h2>
      </div>

      <div className="space-y-6">
        {prepaidCustomerTypes.map((customerType) => (
          <div key={customerType.slug} className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {customerType.label}
            </h3>
            <div className="space-y-4">
              {prepaidCardOperations.map((item) => {
                const isActive =
                  activeCustomerTypeSlug === customerType.slug && activeOperationSlug === item.slug;
                return (
                  <Link
                    key={`${customerType.slug}-${item.slug}`}
                    href={operationHref(customerType.slug, item.slug)}
                    onClick={onNavigate}
                    className={cn(
                      "block border-l-2 pl-4 text-[15px] transition",
                      isActive
                        ? "border-brand font-semibold text-slate-950"
                        : "border-transparent text-slate-700 hover:text-slate-950"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="border-t border-dashed border-slate-300 pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Inputs
          </h3>

          <div className="space-y-3">
            <div className="pb-3 border-b border-dashed border-slate-300">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Start (MM/YY)
              </label>
              <select
                value={startMonth}
                onChange={(event) => updateParam("start", event.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                {availableMonthOptions.map((month) => (
                  <option key={month} value={month} disabled={month > endMonth}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </div>

            <div className="pb-3 border-b border-dashed border-slate-300">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                End (MM/YY)
              </label>
              <select
                value={endMonth}
                onChange={(event) => updateParam("end", event.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                {availableMonthOptions.map((month) => (
                  <option key={month} value={month} disabled={month < startMonth}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                UF value
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sm text-slate-600">
                  $
                </span>
                <input
                  value={formatMoney(Number(ufValue || "0"))}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "");
                    if (!digits) {
                      return;
                    }
                    updateParam("uf", String(Number(digits)));
                  }}
                  inputMode="numeric"
                  className="w-full rounded border border-slate-300 bg-white py-1.5 pl-6 pr-2 text-sm text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
