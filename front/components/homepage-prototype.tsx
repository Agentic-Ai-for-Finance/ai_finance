"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  OptionalSignInButton,
  OptionalSignedIn,
  OptionalSignedOut,
  OptionalUserButton,
} from "@/lib/clerk-compat";

const NAV = [
  { label: "Credit Cards", href: "/credit-cards" },
  { label: "Debit Cards", href: "/debit-cards" },
  { label: "Prepaid Cards", href: "/prepaid-cards" },
  { label: "Checking Accounts", href: "/checking-accounts" },
  { label: "Loans", href: "/loans" },
] as const;

const TICKER = [
  ["CMR Falabella", "Volume", "+20,2%", "up"],
  ["BCI", "Volume", "+8,7%", "up"],
  ["Banco Itaú", "Volume", "+5,6%", "up"],
  ["Banco de Chile", "Market Share", "-0,9 pp", "down"],
  ["Santander", "Market Share", "-1,3 pp", "down"],
  ["Scotiabank", "Activation", "+3,1 pp", "up"],
  ["Banco Estado", "Checking", "+12,4%", "up"],
  ["Tenpo", "Active Cards", "+41,8%", "up"],
  ["Coopeuch", "Consumer Loans", "-2,1%", "down"],
  ["Ripley", "Cash Advances", "+6,7%", "up"],
] as const;

const RANKING = [
  { bank: "CMR Falabella", volume: "$937.874", growth: "+20,2%", share: "24,4%", trend: "up" },
  { bank: "Banco Santander", volume: "$847.598", growth: "+1,2%", share: "22,1%", trend: "down" },
  { bank: "Banco de Chile", volume: "$618.529", growth: "+1,7%", share: "16,1%", trend: "down" },
  { bank: "BCI", volume: "$288.159", growth: "+8,7%", share: "7,5%", trend: "up" },
  { bank: "Banco Itaú", volume: "$217.111", growth: "+5,6%", share: "5,7%", trend: "down" },
] as const;

const PRODUCTS = [
  {
    id: "credit",
    number: "01",
    title: "Credit Cards",
    metrics: ["Purchases", "Cash Advances", "Fees", "Activation Metrics"],
    accent: "var(--home-mint)",
    href: "/credit-cards",
  },
  {
    id: "debit",
    number: "02",
    title: "Debit Cards",
    metrics: ["Volume", "Transactions", "Avg. Ticket", "Activation"],
    accent: "var(--home-amber)",
    href: "/debit-cards",
  },
  {
    id: "prepaid",
    number: "03",
    title: "Prepaid Cards",
    metrics: ["Natural Person", "Business", "ATM", "Activation"],
    accent: "var(--home-pink)",
    href: "/prepaid-cards",
  },
  {
    id: "checking",
    number: "04",
    title: "Checking Accounts",
    metrics: ["Balances", "Accounts", "Average Balance", "UF"],
    accent: "#a78bfa",
    href: "/checking-accounts",
  },
  {
    id: "loans",
    number: "05",
    title: "Loans",
    metrics: ["Consumer", "Mortgage", "Commercial", "Soon"],
    accent: "#60a5fa",
    href: "/loans",
  },
] as const;

function LoginButton({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <OptionalSignedOut>
        <OptionalSignInButton>
          <button
            type="button"
            className={[
              "border border-white bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--home-background)] transition-colors hover:border-[var(--home-mint)] hover:bg-[var(--home-mint)]",
              compact ? "px-3 py-1.5 text-[10px]" : "",
            ].join(" ")}
          >
            Login
          </button>
        </OptionalSignInButton>
      </OptionalSignedOut>
      <OptionalSignedIn>
        <OptionalUserButton afterSignOutUrl="/" />
      </OptionalSignedIn>
    </>
  );
}

function HomeNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--home-rule)] bg-[color:rgb(18_28_45_/_0.88)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-[family:var(--font-home-display)] text-2xl tracking-tight text-[var(--home-foreground)]">
            Taclaro
          </span>
          <span className="h-1.5 w-1.5 bg-[var(--home-mint)] home-pulse-dot" />
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--home-muted)] transition-colors hover:text-[var(--home-foreground)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <LoginButton />
        </div>
        <div className="md:hidden">
          <LoginButton compact />
        </div>
      </div>
    </header>
  );
}

function TickerStrip() {
  const items = [...TICKER, ...TICKER];

  return (
    <div className="overflow-hidden border-y border-[var(--home-rule)] bg-[var(--home-surface)]">
      <div className="home-ticker flex w-max gap-10 py-3 font-[family:var(--font-home-mono)] text-[12px]">
        {items.map((item, index) => (
          <div key={`${item[0]}-${index}`} className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-[var(--home-muted)]">{item[0]}</span>
            <span className="text-white/50">/ {item[1]}</span>
            <span className={item[3] === "up" ? "text-[var(--home-mint)]" : "text-[var(--home-pink)]"}>
              {item[3] === "up" ? "▲" : "▼"} {item[2]}
            </span>
            <span className="text-[var(--home-rule)]">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniChart() {
  const series = [
    { name: "CMR Falabella", color: "var(--home-mint)", points: [78, 92, 88, 86, 95, 90, 88, 93, 96, 100, 92, 86, 84] },
    { name: "Santander", color: "var(--home-amber)", points: [70, 80, 78, 75, 82, 80, 78, 80, 86, 88, 82, 80, 78] },
    { name: "Banco de Chile", color: "var(--home-pink)", points: [55, 62, 60, 58, 60, 58, 56, 60, 64, 68, 62, 58, 56] },
    { name: "BCI", color: "#a78bfa", points: [28, 30, 30, 29, 32, 30, 29, 31, 32, 34, 32, 30, 29] },
    { name: "Banco Itaú", color: "#60a5fa", points: [22, 23, 23, 22, 24, 23, 22, 23, 24, 25, 23, 22, 21] },
  ] as const;
  const width = 720;
  const height = 280;
  const padding = { left: 36, right: 12, top: 16, bottom: 28 };
  const maxValue = 105;
  const step = (width - padding.left - padding.right) / 12;
  const months = ["02/25", "04/25", "06/25", "08/25", "10/25", "12/25", "02/26"];
  const pathFor = (points: readonly number[]) =>
    points
      .map((value, index) => {
        const x = padding.left + index * step;
        const y = padding.top + (height - padding.top - padding.bottom) * (1 - value / maxValue);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((grid, index) => {
        const y = padding.top + (height - padding.top - padding.bottom) * grid;
        return (
          <g key={index}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="var(--home-rule)"
              strokeDasharray="2 4"
            />
            <text
              x={6}
              y={y + 3}
              fontSize="9"
              fill="var(--home-muted)"
              fontFamily="var(--font-home-mono)"
            >
              ${(((1 - grid) * maxValue) | 0) * 15}k
            </text>
          </g>
        );
      })}
      {months.map((month, index) => (
        <text
          key={month}
          x={padding.left + index * step * 2}
          y={height - 10}
          fontSize="9"
          fill="var(--home-muted)"
          fontFamily="var(--font-home-mono)"
        >
          {month}
        </text>
      ))}
      {series.map((line, index) => (
        <g key={line.name}>
          <path
            d={pathFor(line.points)}
            fill="none"
            stroke={line.color}
            strokeWidth={1.6}
            className="home-draw-line"
            style={{ animationDelay: `${index * 0.15}s` }}
          />
          {line.points.map((value, pointIndex) => {
            const x = padding.left + pointIndex * step;
            const y = padding.top + (height - padding.top - padding.bottom) * (1 - value / maxValue);
            return <circle key={pointIndex} cx={x} cy={y} r={2} fill={line.color} />;
          })}
        </g>
      ))}
    </svg>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--home-rule)]">
      <div className="home-grid-glow pointer-events-none absolute inset-0" />
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-0 px-4 py-16 sm:px-6 md:py-24">
        <div className="col-span-12 lg:col-span-7 lg:pr-10">
          <div className="mb-6 flex items-center gap-3 font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--home-mint)]">
            <span className="h-2 w-2 bg-[var(--home-mint)] home-pulse-dot" />
            Live · monthly series · Chilean banking
          </div>
          <h1 className="font-[family:var(--font-home-display)] text-[clamp(2.6rem,6.5vw,5.4rem)] leading-[0.95] tracking-tight text-[var(--home-foreground)]">
            The banking benchmark,
            <span className="italic text-[var(--home-mint)]"> without downloading</span> a single file.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--home-muted)]">
            What used to mean downloading spreadsheets, normalizing UF, cleaning issuer names, and
            building charts now starts from one screen. Credit, debit, prepaid, checking, and
            loans in one React surface, ready for the backend wire-up later.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/credit-cards/purchases?view=volume"
              className="group inline-flex items-center gap-3 bg-[var(--home-mint)] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--home-background)] transition-colors hover:bg-white"
            >
              View live demo
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <a
              href="#methodology"
              className="inline-flex items-center gap-2 border-b border-[var(--home-rule)] pb-1 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--home-muted)] hover:text-[var(--home-foreground)]"
            >
              UF methodology
            </a>
          </div>

          <dl className="mt-14 grid grid-cols-1 gap-px bg-[var(--home-rule)] sm:grid-cols-3">
            {[
              ["16+", "Institutions"],
              ["48", "Months"],
              ["UF", "Deflated"],
            ].map(([key, value]) => (
              <div key={value} className="bg-[var(--home-background)] p-5">
                <dt className="font-[family:var(--font-home-display)] text-3xl text-[var(--home-foreground)]">
                  {key}
                </dt>
                <dd className="mt-1 font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--home-muted)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="col-span-12 mt-12 lg:col-span-5 lg:mt-0">
          <div className="relative border border-[var(--home-rule)] bg-[var(--home-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--home-rule)] px-5 py-3">
              <div>
                <div className="font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--home-muted)]">
                  Volume / Purchases · MM CLP UF-adj
                </div>
                <div className="mt-1 font-[family:var(--font-home-display)] text-lg text-[var(--home-foreground)]">
                  Top 5 issuers · 02/25 → 02/26
                </div>
              </div>
              <div className="flex items-center gap-2 font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--home-mint)]">
                <span className="h-1.5 w-1.5 bg-[var(--home-mint)] home-pulse-dot" />
                Live
              </div>
            </div>
            <div className="aspect-[720/280] w-full">
              <MiniChart />
            </div>
            <div className="grid grid-cols-5 gap-px border-t border-[var(--home-rule)] bg-[var(--home-rule)]">
              {[
                ["CMR", "var(--home-mint)"],
                ["Sant.", "var(--home-amber)"],
                ["Chile", "var(--home-pink)"],
                ["BCI", "#a78bfa"],
                ["Itaú", "#60a5fa"],
              ].map(([name, color]) => (
                <div key={name} className="flex items-center gap-2 bg-[var(--home-surface)] px-3 py-2">
                  <span className="h-2 w-2" style={{ background: color }} />
                  <span className="font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-wider text-[var(--home-muted)]">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-12 gap-1">
            {Array.from({ length: 12 }).map((_, index) => {
              const height = 12 + ((index * 37) % 70);
              return (
                <div
                  key={index}
                  className="bg-[var(--home-mint)]/70"
                  style={{ height: `${height}px`, opacity: 0.3 + (index % 5) * 0.14 }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function RankingSection() {
  const [tab, setTab] = useState<"volume" | "share" | "growth">("volume");

  return (
    <section id="credit" className="border-b border-[var(--home-rule)]">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <div className="font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--home-mint)]">
              02 — Snapshot
            </div>
            <h2 className="mt-4 font-[family:var(--font-home-display)] text-4xl leading-tight text-[var(--home-foreground)] md:text-5xl">
              Who leads this month,
              <span className="italic text-[var(--home-muted)]"> and by how much.</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[var(--home-muted)]">
              Volume, market share, and monthly growth already crossed together. No Excel, no
              pasted tabs, no cleanup step in the middle.
            </p>
            <div className="mt-8 flex gap-px bg-[var(--home-rule)]">
              {[
                { key: "volume", label: "Volume" },
                { key: "share", label: "Market Share" },
                { key: "growth", label: "Growth" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key as typeof tab)}
                  className={`px-4 py-2 font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    tab === item.key
                      ? "bg-[var(--home-foreground)] text-[var(--home-background)]"
                      : "bg-[var(--home-surface)] text-[var(--home-muted)] hover:text-[var(--home-foreground)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <div className="border border-[var(--home-rule)]">
              <div className="grid grid-cols-12 gap-4 border-b border-[var(--home-rule)] bg-[var(--home-surface)] px-5 py-3 font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--home-muted)]">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Bank</div>
                <div className="col-span-3 text-right">Volume 02/26</div>
                <div className="col-span-2 text-right">YoY</div>
                <div className="col-span-2 text-right">Share</div>
              </div>
              {RANKING.map((item, index) => {
                const width = parseFloat(item.share.replace(",", "."));
                return (
                  <div
                    key={item.bank}
                    className="relative grid grid-cols-12 items-center gap-4 border-b border-[var(--home-rule)] px-5 py-4 last:border-b-0 transition-colors hover:bg-[var(--home-surface)]"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-[var(--home-mint)]/10"
                      style={{ width: `${width * 3}%` }}
                    />
                    <div className="relative col-span-1 font-[family:var(--font-home-mono)] text-[11px] text-[var(--home-muted)]">
                      0{index + 1}
                    </div>
                    <div className="relative col-span-4 font-[family:var(--font-home-display)] text-lg text-[var(--home-foreground)]">
                      {item.bank}
                    </div>
                    <div className="relative col-span-3 text-right font-[family:var(--font-home-mono)] text-sm text-[var(--home-foreground)]">
                      {item.volume}
                    </div>
                    <div
                      className={`relative col-span-2 text-right font-[family:var(--font-home-mono)] text-sm ${
                        item.trend === "up" ? "text-[var(--home-mint)]" : "text-[var(--home-pink)]"
                      }`}
                    >
                      {item.growth}
                    </div>
                    <div className="relative col-span-2 text-right font-[family:var(--font-home-mono)] text-sm text-[var(--home-foreground)]">
                      {item.share}
                    </div>
                  </div>
                );
              })}
              <div className="grid grid-cols-12 gap-4 bg-[var(--home-surface)] px-5 py-3 font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-wider text-[var(--home-muted)]">
                <div className="col-span-5">System total</div>
                <div className="col-span-3 text-right text-[var(--home-foreground)]">$3.839.569</div>
                <div className="col-span-2 text-right text-[var(--home-mint)]">+7,4%</div>
                <div className="col-span-2 text-right text-[var(--home-foreground)]">100,0%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductsSection() {
  return (
    <section className="border-b border-[var(--home-rule)]">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <div className="mb-12 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <div className="font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--home-mint)]">
              03 — Coverage
            </div>
            <h2 className="mt-4 font-[family:var(--font-home-display)] text-4xl leading-tight text-[var(--home-foreground)] md:text-5xl">
              Five products.
              <span className="italic text-[var(--home-muted)]"> One view.</span>
            </h2>
          </div>
          <div className="max-w-sm text-sm text-[var(--home-muted)]">
            Each product keeps its own metric set, but the frontend language, navigation, and
            interaction model stay aligned with the existing `front/` methodology.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px bg-[var(--home-rule)] md:grid-cols-2 lg:grid-cols-5">
          {PRODUCTS.map((product) => (
            <Link
              key={product.id}
              href={product.href}
              className="group relative flex flex-col justify-between bg-[var(--home-background)] p-6 transition-colors hover:bg-[var(--home-surface)]"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--home-muted)]">
                    {product.number}
                  </span>
                  <span
                    className="h-3 w-3 transition-transform group-hover:scale-125"
                    style={{ background: product.accent }}
                  />
                </div>
                <h3 className="mt-10 font-[family:var(--font-home-display)] text-2xl leading-tight text-[var(--home-foreground)]">
                  {product.title}
                </h3>
              </div>
              <ul className="mt-10 space-y-1.5 font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-wider text-[var(--home-muted)]">
                {product.metrics.map((metric) => (
                  <li key={metric} className="flex items-center gap-2">
                    <span className="h-px w-3 bg-[var(--home-rule)]" />
                    {metric}
                  </li>
                ))}
              </ul>
              <div
                className="mt-8 h-1 origin-left scale-x-50 transition-transform group-hover:scale-x-100"
                style={{ background: product.accent }}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  const before = [
    "Download CMF spreadsheets",
    "Clean and join multiple tabs",
    "Convert CLP to UF month by month",
    "Build charts manually",
    "Repeat every month",
  ];
  const after = ["Open Taclaro", "Choose a metric", "Start the analysis"];

  return (
    <section id="methodology" className="border-b border-[var(--home-rule)] bg-[var(--home-surface)]">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <div className="font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--home-mint)]">
              04 — Method
            </div>
            <h2 className="mt-4 font-[family:var(--font-home-display)] text-4xl leading-tight text-[var(--home-foreground)] md:text-5xl">
              From five hours
              <span className="block italic text-[var(--home-mint)]">to five seconds.</span>
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--home-muted)]">
              The prototype keeps the same core premise as the source app: UF-adjusted values,
              cleaner product framing, and faster entry into the market question that matters.
            </p>
          </div>
          <div className="col-span-12 grid grid-cols-1 gap-px bg-[var(--home-rule)] lg:col-span-8 lg:grid-cols-2">
            <div className="bg-[var(--home-background)] p-8">
              <div className="flex items-center gap-3 font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--home-pink)]">
                <span className="h-1.5 w-6 bg-[var(--home-pink)]" />
                Before
              </div>
              <ol className="mt-6 space-y-4">
                {before.map((step, index) => (
                  <li key={step} className="flex gap-4 border-b border-[var(--home-rule)] pb-3 last:border-b-0">
                    <span className="font-[family:var(--font-home-mono)] text-[11px] text-[var(--home-muted)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[var(--home-muted)] line-through decoration-[var(--home-pink)]/60">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-[var(--home-background)] p-8">
              <div className="flex items-center gap-3 font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--home-mint)]">
                <span className="h-1.5 w-6 bg-[var(--home-mint)]" />
                Now
              </div>
              <ol className="mt-6 space-y-4">
                {after.map((step, index) => (
                  <li key={step} className="flex gap-4 border-b border-[var(--home-rule)] pb-3 last:border-b-0">
                    <span className="font-[family:var(--font-home-mono)] text-[11px] text-[var(--home-mint)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-base text-[var(--home-foreground)]">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-10 flex items-baseline gap-3">
                <div className="font-[family:var(--font-home-display)] text-6xl text-[var(--home-mint)]">5s</div>
                <div className="font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-wider text-[var(--home-muted)]">
                  to get the answer
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SystemPulseSection() {
  const [value, setValue] = useState(3839569);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setValue((current) => current + Math.floor(Math.random() * 800));
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, []);

  const formattedValue = useMemo(() => value.toLocaleString("es-CL"), [value]);

  return (
    <section className="border-b border-[var(--home-rule)]">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="grid grid-cols-12 items-end gap-8">
          <div className="col-span-12 lg:col-span-7">
            <div className="font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--home-mint)]">
              05 — System pulse
            </div>
            <div className="mt-4 font-[family:var(--font-home-display)] text-[clamp(2.4rem,7vw,5.5rem)] leading-none tracking-tight text-[var(--home-foreground)] tabular-nums">
              ${formattedValue}
              <span className="ml-3 text-2xl text-[var(--home-muted)]">MM CLP</span>
            </div>
            <div className="mt-3 font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-wider text-[var(--home-muted)]">
              Aggregated purchase volume · 02/26 series · UF-adjusted
            </div>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <div className="grid grid-cols-2 gap-px bg-[var(--home-rule)]">
              {[
                ["+7,4%", "vs 02/25"],
                ["16", "institutions"],
                ["100%", "CMF coverage"],
                ["UF 40.290", "daily value"],
              ].map(([headline, label]) => (
                <div key={label} className="bg-[var(--home-background)] px-5 py-4">
                  <div className="font-[family:var(--font-home-display)] text-2xl text-[var(--home-foreground)]">
                    {headline}
                  </div>
                  <div className="mt-1 font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-wider text-[var(--home-muted)]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CallToActionSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--home-rule)]">
      <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-6">
        <div className="grid grid-cols-12 items-center gap-8">
          <div className="col-span-12 lg:col-span-8">
            <h2 className="font-[family:var(--font-home-display)] text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-tight text-[var(--home-foreground)]">
              Stop fighting spreadsheets.
              <span className="block italic text-[var(--home-mint)]">Start comparing.</span>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <div className="flex flex-col gap-3">
              <Link
                href="/credit-cards/purchases?view=volume"
                className="group flex items-center justify-between bg-[var(--home-mint)] px-6 py-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--home-background)] transition-colors hover:bg-white"
              >
                Enter Taclaro
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/debit-cards/transactions?view=volume"
                className="flex items-center justify-between border border-[var(--home-rule)] px-6 py-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--home-foreground)] transition-colors hover:border-white"
              >
                See prototype flow
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        <div
          className="mt-16 grid gap-1 opacity-70"
          style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
        >
          {Array.from({ length: 48 }).map((_, index) => (
            <div
              key={index}
              className="h-2"
              style={{
                background:
                  index % 7 === 0
                    ? "var(--home-mint)"
                    : index % 11 === 0
                      ? "var(--home-pink)"
                      : "var(--home-rule)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="bg-[var(--home-background)]">
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-8 px-4 py-16 sm:px-6">
        <div className="col-span-12 md:col-span-5">
          <div className="flex items-baseline gap-2">
            <span className="font-[family:var(--font-home-display)] text-3xl text-[var(--home-foreground)]">
              Taclaro
            </span>
            <span className="h-1.5 w-1.5 bg-[var(--home-mint)]" />
          </div>
          <p className="mt-4 max-w-sm text-sm text-[var(--home-muted)]">
            Instant benchmark for Chilean banking. Public CMF data, normalized, UF-adjusted, and
            presented in the same product shell as the main app.
          </p>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--home-muted)]">
            Products
          </div>
          <ul className="mt-4 space-y-2 text-sm text-[var(--home-foreground)]">
            {NAV.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="hover:text-[var(--home-mint)]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--home-muted)]">
            Method
          </div>
          <ul className="mt-4 space-y-2 text-sm text-[var(--home-foreground)]">
            <li>UF-adjusted values</li>
            <li>API-first frontend</li>
            <li>Protected derived metrics</li>
          </ul>
        </div>
        <div className="col-span-12 md:col-span-3">
          <div className="font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--home-muted)]">
            Prototype note
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[var(--home-muted)]">
            This first pass is presentation-only. The next step is wiring each section into the
            existing secured API layer inside `front/app/api/v1`.
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--home-rule)]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-5 font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--home-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>© 2026 Taclaro</div>
          <div>Prototype aligned to Next.js front shell</div>
        </div>
      </div>
    </footer>
  );
}

export function HomepagePrototype() {
  return (
    <div className="min-h-screen bg-[var(--home-background)] text-[var(--home-foreground)]">
      <HomeNav />
      <TickerStrip />
      <main>
        <HeroSection />
        <RankingSection />
        <ProductsSection />
        <WorkflowSection />
        <SystemPulseSection />
        <CallToActionSection />
      </main>
      <FooterSection />
    </div>
  );
}
