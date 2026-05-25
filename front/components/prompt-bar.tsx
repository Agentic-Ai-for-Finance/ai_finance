"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOptionalAuth } from "@/lib/clerk-compat";
import { useSearchContext, formatContextTag } from "@/lib/search-context";
import { cn } from "@/lib/utils";

type Source = {
  title: string;
  url: string;
  domain: string;
  snippet: string;
};

type SearchResult = {
  summary: string;
  sources: Source[];
  query: string;
  model: string;
  searchResultCount: number;
};

type SearchError = {
  error: { code: string; message: string };
};

type PromptBarProps = {
  variant?: "light" | "dark";
};

export function PromptBar({ variant = "light" }: PromptBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isSignedIn } = useOptionalAuth();
  const dashboard = useSearchContext();

  const open = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResult(null);
    setError(null);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 3 || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    const body: Record<string, unknown> = { query: trimmed };
    if (dashboard) {
      body.context = {
        section: dashboard.section,
        sectionLabel: dashboard.sectionLabel,
        operation: dashboard.operation,
        operationLabel: dashboard.operationLabel,
        view: dashboard.view,
        viewLabel: dashboard.viewLabel,
        startMonth: dashboard.startMonth,
        endMonth: dashboard.endMonth,
        selectedBanks: dashboard.selectedBanks,
        bankSummaries: dashboard.bankSummaries,
      };
    }

    try {
      const res = await fetch("/api/v1/analysis/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as SearchError | null;
        const message =
          res.status === 401
            ? "Sign in to use research search."
            : res.status === 429
              ? "Search limit reached. Try again later."
              : errBody?.error?.message ?? "Something went wrong.";
        setError(message);
        return;
      }

      const data = (await res.json()) as SearchResult;
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const isDark = variant === "dark";
  const contextTag = dashboard ? formatContextTag(dashboard) : null;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition",
          isDark
            ? "border-[var(--home-rule)] bg-[var(--home-surface)] text-[var(--home-muted)] hover:border-[var(--home-mint)] hover:text-[var(--home-foreground)]"
            : "border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400 hover:text-slate-700"
        )}
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Research</span>
        <kbd
          className={cn(
            "ml-1 hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline-block",
            isDark
              ? "bg-[var(--home-background)] text-[var(--home-muted)]"
              : "bg-slate-200 text-slate-500"
          )}
        >
          ⌘K
        </kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]" onClick={close}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

          <div
            className="relative z-10 mx-4 w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Context tag */}
            {contextTag && (
              <div className="border-b border-slate-100 px-4 py-2">
                <p className="truncate text-[11px] font-medium text-slate-500">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {contextTag}
                </p>
              </div>
            )}

            {/* Search input */}
            <form onSubmit={handleSubmit} className="flex items-center border-b border-slate-200 px-4">
              <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  isSignedIn
                    ? dashboard
                      ? `Ask about ${dashboard.sectionLabel.toLowerCase()}...`
                      : "Ask about Chilean banking..."
                    : "Sign in to search..."
                }
                disabled={!isSignedIn}
                maxLength={500}
                className="flex-1 bg-transparent px-3 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              ) : (
                <button
                  type="submit"
                  disabled={query.trim().length < 3 || !isSignedIn}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white transition hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-900"
                >
                  Search
                </button>
              )}
            </form>

            {/* Results area */}
            <div className="max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="px-5 py-4 text-sm text-red-600">{error}</div>
              )}

              {result && result.summary === "" && (
                <div className="px-5 py-8 text-center text-sm text-slate-500">
                  No results found. Try a different query.
                </div>
              )}

              {result && result.summary !== "" && (
                <div className="space-y-4 px-5 py-4">
                  <div className="prose prose-sm max-w-none text-slate-700">
                    <p className="whitespace-pre-line">{result.summary}</p>
                  </div>

                  {result.sources.length > 0 && (
                    <div className="border-t border-slate-100 pt-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Sources ({result.sources.length})
                      </p>
                      <ul className="space-y-2">
                        {result.sources.map((source, i) => (
                          <li key={source.url} className="group flex items-start gap-2">
                            <span className="mt-0.5 shrink-0 font-mono text-[10px] text-slate-400">
                              [{i + 1}]
                            </span>
                            <div className="min-w-0">
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-slate-800 underline decoration-slate-300 transition hover:decoration-slate-600"
                              >
                                {source.title}
                              </a>
                              <p className="mt-0.5 text-[11px] text-slate-400">{source.domain}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                    {result.searchResultCount} results via {result.model}
                  </div>
                </div>
              )}

              {!result && !error && !isLoading && (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-slate-500">
                    {dashboard
                      ? `Search for research and news related to your current ${dashboard.sectionLabel.toLowerCase()} analysis.`
                      : "Search across Chilean financial research from CMF, Banco Central, and 20+ sources."}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {(dashboard
                      ? [
                          `${dashboard.operationLabel} trends`,
                          `${dashboard.selectedBanks[0]?.name ?? "market"} outlook`,
                          `${dashboard.sectionLabel} regulation`,
                        ]
                      : [
                          "Credit card growth 2025",
                          "Chilean fintech regulation",
                          "Banking sector profitability",
                        ]
                    ).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        disabled={!isSignedIn}
                        onClick={() => {
                          setQuery(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:opacity-40"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
              <span>Powered by Taclaro Research</span>
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">ESC to close</kbd>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
        clipRule="evenodd"
      />
    </svg>
  );
}
