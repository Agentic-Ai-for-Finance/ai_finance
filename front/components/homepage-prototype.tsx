"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { checkingAccountOperations } from "@/lib/checking-account-config";
import { creditCardOperations } from "@/lib/credit-card-config";
import {
  OptionalSignInButton,
  OptionalSignedIn,
  OptionalSignedOut,
  OptionalUserButton,
} from "@/lib/clerk-compat";
import { debitCardOperations } from "@/lib/debit-card-config";
import { prepaidCardOperations, prepaidCustomerTypes } from "@/lib/prepaid-card-config";

const NAV = [
  { label: "Credit Cards", href: "/credit-cards" },
  { label: "Debit Cards", href: "/debit-cards" },
  { label: "Prepaid Cards", href: "/prepaid-cards" },
  { label: "Checking Accounts", href: "/checking-accounts" },
  { label: "Loans", href: "/loans" },
] as const;

const PRODUCTS = [
  {
    id: "credit",
    title: "Credit Cards",
    metrics: ["Purchases", "Cash Advances", "Fees", "Activation Metrics"],
    accent: "var(--home-mint)",
    href: "/credit-cards",
  },
  {
    id: "debit",
    title: "Debit Cards",
    metrics: ["Volume", "Transactions", "Avg. Ticket", "Activation"],
    accent: "var(--home-amber)",
    href: "/debit-cards",
  },
  {
    id: "prepaid",
    title: "Prepaid Cards",
    metrics: ["Natural Person", "Business", "ATM", "Activation"],
    accent: "var(--home-pink)",
    href: "/prepaid-cards",
  },
  {
    id: "checking",
    title: "Checking Accounts",
    metrics: ["Balances", "Accounts", "Average Balance", "UF"],
    accent: "var(--home-mint)",
    href: "/checking-accounts",
  },
  {
    id: "loans",
    title: "Loans",
    metrics: ["Consumer", "Mortgage", "Commercial", "Soon"],
    accent: "var(--home-amber)",
    href: "/loans",
  },
] as const;


type LivePulseCase = {
  product: string;
  volume: string;
  growth: string;
};

const LIVE_PULSE_CASES: LivePulseCase[] = [
  { product: "Credit Cards / Purchases", volume: "$3.839.569 MM CLP", growth: "+7,4%" },
  { product: "Debit Cards / Debit Transactions", volume: "591.228.900 Transactions", growth: "+6,9%" },
  { product: "Prepaid Cards / Purchases", volume: "$143.219 MM CLP", growth: "+21,5%" },
  { product: "Checking / Natural Without Interest", volume: "34.973.055 Accounts", growth: "+6,2%" },
];

type HomepagePrototypeProps = {
  navStyle?: "dark" | "white-shell";
  homeHref?: string;
};

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

function navDropdownItems(href: string) {
  if (href === "/credit-cards") {
    return creditCardOperations.map((item) => ({
      label: item.label,
      href: `/credit-cards/${item.slug}?view=${item.slug === "total-activation-rate" ? "total-active-cards" : "volume"}`,
    }));
  }

  if (href === "/debit-cards") {
    return debitCardOperations.map((item) => ({
      label: item.label,
      href: `/debit-cards/${item.slug}?view=${item.slug === "total-activation-rate" ? "total-active-cards" : "volume"}`,
    }));
  }

  if (href === "/checking-accounts") {
    return checkingAccountOperations.map((item) => ({
      label: item.label,
      href: `/checking-accounts/${item.slug}?view=volume`,
    }));
  }

  if (href === "/prepaid-cards") {
    return prepaidCustomerTypes.flatMap((customerType) =>
      prepaidCardOperations.map((item) => ({
        label: `${customerType.label}: ${item.label}`,
        href: `/prepaid-cards/${customerType.slug}/${item.slug}?view=${
          item.slug === "total-activation-rate" ? "total-active-cards" : "volume"
        }`,
      }))
    );
  }

  return [];
}

function HomeNav({ navStyle = "dark", homeHref = "/" }: HomepagePrototypeProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (navStyle === "white-shell") {
    return (
      <header className="sticky top-0 z-50 bg-white text-slate-950 shadow-sm">
        <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:hidden">
          <Link href={homeHref} className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight text-slate-950">Taclaro</p>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded border border-slate-300 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700"
            >
              Menu
            </button>
            <OptionalSignedOut>
              <OptionalSignInButton>
                <button
                  type="button"
                  className="rounded-sm border border-slate-950 bg-slate-950 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[var(--home-mint)] hover:text-slate-950"
                >
                  Login
                </button>
              </OptionalSignInButton>
            </OptionalSignedOut>
            <OptionalSignedIn>
              <OptionalUserButton afterSignOutUrl="/" />
            </OptionalSignedIn>
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 sm:px-6 lg:hidden">
          <nav className="flex items-center gap-5 overflow-x-auto whitespace-nowrap pb-0.5">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="border-b-2 border-transparent pb-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-700 transition hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden h-16 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 sm:px-6 lg:grid lg:px-8">
          <Link href={homeHref} className="justify-self-start">
            <p className="text-xl font-semibold tracking-tight text-slate-950">Taclaro</p>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-7">
            {NAV.map((item) => {
              const dropdownItems = navDropdownItems(item.href);

              return (
                <div key={item.label} className="group relative">
                  <Link
                    href={item.href}
                    className="border-b-2 border-transparent pb-0.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-700 transition hover:text-slate-950 focus-visible:text-slate-950"
                  >
                    {item.label}
                  </Link>
                  {dropdownItems.length > 0 ? (
                    <div className="pointer-events-none absolute left-1/2 top-full z-40 hidden w-72 -translate-x-1/2 pt-1 group-hover:block group-focus-within:block">
                      <div className="h-2 w-full" />
                      <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                        {dropdownItems.map((dropdownItem) => (
                          <Link
                            key={dropdownItem.href}
                            href={dropdownItem.href}
                            className="block rounded-md px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                          >
                            {dropdownItem.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="justify-self-end">
            <OptionalSignedOut>
              <OptionalSignInButton>
                <button
                  type="button"
                  className="rounded-sm border border-slate-950 bg-slate-950 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-[var(--home-mint)] hover:text-slate-950"
                >
                  Login
                </button>
              </OptionalSignInButton>
            </OptionalSignedOut>
            <OptionalSignedIn>
              <OptionalUserButton afterSignOutUrl="/" />
            </OptionalSignedIn>
          </div>
        </div>

        {isMobileMenuOpen ? (
          <div className="fixed inset-0 z-50 bg-slate-950/50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <aside
              className="h-full w-[86vw] max-w-sm overflow-y-auto bg-[#eef3fa] px-4 py-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Navigation</p>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded border border-slate-300 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700"
                >
                  Close
                </button>
              </div>
              <div className="space-y-4">
                {NAV.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block border-l-2 border-transparent pl-4 text-[15px] text-slate-700 transition hover:border-[var(--home-mint)] hover:text-slate-950"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--home-rule)] bg-[color:rgb(18_28_45_/_0.88)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={homeHref} className="flex items-baseline gap-2">
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
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--home-foreground)]/90 transition-colors hover:text-[var(--home-mint)]"
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

function MiniChart() {
  const series = [
    { name: "Banco Estado", color: "var(--home-mint)", points: [85, 86, 87, 88, 89, 90, 91, 92, 92, 93, 94, 95, 96] },
    { name: "Banco Santander", color: "var(--home-amber)", points: [72, 73, 74, 75, 76, 76, 77, 78, 79, 80, 81, 82, 83] },
    { name: "Banco de Chile", color: "var(--home-pink)", points: [64, 64, 65, 66, 66, 67, 67, 68, 69, 69, 70, 71, 71] },
    { name: "BCI", color: "var(--home-mint)", points: [52, 53, 53, 54, 55, 55, 56, 56, 57, 58, 58, 59, 60] },
    { name: "Banco Falabella", color: "var(--home-amber)", points: [31, 31, 32, 33, 33, 34, 35, 35, 36, 37, 38, 39, 40] },
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
          <text
            x={width - padding.right + 6}
            y={padding.top + (height - padding.top - padding.bottom) * (1 - line.points[line.points.length - 1] / maxValue) + 3}
            fontSize="9"
            fill={line.color}
            fontFamily="var(--font-home-mono)"
          >
            {line.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center border-b border-[var(--home-rule)]">
      <div className="home-grid-glow pointer-events-none absolute inset-0" />
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-0 px-4 py-12 sm:px-6 md:py-14">
        <div className="col-span-12 lg:col-span-7 lg:pr-10">
          <h1 className="font-[family:var(--font-home-display)] text-[clamp(2.6rem,6.5vw,5.4rem)] leading-[0.95] tracking-tight text-[var(--home-foreground)]">
            The banking benchmark,
            <span className="italic text-[var(--home-mint)]"> without downloading</span> a single file
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--home-muted)]">
            What used to mean downloading spreadsheets, normalizing UF, cleaning issuer names, and
            building charts now starts from one screen.
          </p>

          <dl className="mt-12 grid grid-cols-1 gap-px bg-[var(--home-rule)] sm:grid-cols-3">
            {[
              ["20+", "Institutions"],
              ["17", "Years of data"],
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

        <div className="col-span-12 mt-10 lg:col-span-5 lg:mt-0">
          <div className="relative border border-[var(--home-rule)] bg-[var(--home-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--home-rule)] px-5 py-3">
              <div>
                <div className="font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--home-muted)]">
                  Total Active Cards · Monthly trend
                </div>
                <div className="mt-1 font-[family:var(--font-home-display)] text-lg text-[var(--home-foreground)]">
                  Top issuers · 02/25 → 02/26
                </div>
              </div>
            </div>
            <div className="aspect-[720/280] w-full">
              <MiniChart />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductsSection() {
  return (
    <section className="border-b border-[var(--home-rule)] py-14 sm:py-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--home-mint)]">
              02 — Coverage
            </div>
            <h2 className="mt-4 font-[family:var(--font-home-display)] text-4xl leading-tight text-[var(--home-foreground)] md:text-5xl">
              Five products.
              <span className="italic text-[var(--home-muted)]"> One view.</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {PRODUCTS.map((product) => (
            <Link
              key={product.id}
              href={product.href}
              className="group relative flex h-full flex-col justify-between rounded-2xl border border-[var(--home-rule)] bg-[color:rgb(12_24_41_/_0.78)] p-6 transition-all hover:-translate-y-1 hover:border-[var(--home-mint)] hover:bg-[var(--home-surface)]"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-[family:var(--font-home-display)] text-2xl leading-tight text-[var(--home-foreground)]">
                    {product.title}
                  </h3>
                  <span
                    className="mt-1 h-3 w-3 shrink-0 transition-transform group-hover:scale-125"
                    style={{ background: product.accent }}
                  />
                </div>
              </div>
              <ul className="mt-10 space-y-1.5 font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-wider text-[var(--home-muted)]">
                {product.metrics.map((metric) => (
                  <li key={metric} className="flex items-center gap-2">
                    <span className="h-px w-3 bg-[var(--home-rule)]" />
                    {metric}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex items-center justify-between">
                <div
                  className="h-1 w-16 origin-left transition-all group-hover:w-24"
                  style={{ background: product.accent }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--home-muted)]">
                  Explore →
                </span>
              </div>
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
  const after = ["Open Taclaro", "Choose a metric", "Get the insights"];

  return (
    <section id="methodology" className="border-b border-[var(--home-rule)] bg-[var(--home-surface)] py-14 sm:py-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <div className="font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--home-mint)]">
              03 — Method
            </div>
            <h2 className="mt-4 font-[family:var(--font-home-display)] text-4xl leading-tight text-[var(--home-foreground)] md:text-5xl">
              From hours
              <span className="block italic text-[var(--home-mint)]">to seconds.</span>
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--home-muted)]">
              The same UF-adjusted methodology, but without manual cleanup loops before real analysis.
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
                  <li key={step} className="flex items-center gap-3 border-b border-[var(--home-rule)] pb-3 last:border-b-0">
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
                With Taclaro
              </div>
              <ol className="mt-6 space-y-4">
                {after.map((step, index) => (
                  <li key={step} className="flex items-center gap-3 border-b border-[var(--home-rule)] pb-3 last:border-b-0">
                    <span className="font-[family:var(--font-home-mono)] text-[11px] text-[var(--home-mint)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-base text-[var(--home-foreground)]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LivePulseSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setIsVisible(false);
      window.setTimeout(() => {
        setActiveIndex((current) => (current + 1) % LIVE_PULSE_CASES.length);
        setIsVisible(true);
      }, 220);
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeCase = LIVE_PULSE_CASES[activeIndex];
  const monthLabel = "Latest month: 02/26";

  return (
    <section className="border-b border-[var(--home-rule)] bg-[var(--home-surface)] py-16 sm:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--home-mint)]">
              04 — Live pulse
            </div>
            <h2 className="mt-3 font-[family:var(--font-home-display)] text-4xl text-[var(--home-foreground)] sm:text-5xl">
              Product momentum at a glance
            </h2>
          </div>
          <div className="font-[family:var(--font-home-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--home-muted)]">
            {monthLabel}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-px bg-[var(--home-rule)] md:grid-cols-3">
          {[
            { label: "Product", value: activeCase.product, tone: "text-[var(--home-foreground)]" },
            { label: "Volume", value: activeCase.volume, tone: "text-[var(--home-foreground)]" },
            { label: "Growth YoY", value: activeCase.growth, tone: "text-[var(--home-mint)]" },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`relative overflow-hidden bg-[var(--home-background)] px-6 py-7 transition-all duration-500 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--home-mint),transparent)] opacity-70" />
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--home-muted)]">
                {item.label}
              </div>
              <div className={`mt-4 text-2xl font-semibold sm:text-3xl ${item.tone}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CallToActionSection() {
  return (
    <section className="relative border-b border-[var(--home-rule)] py-16 sm:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="grid grid-cols-12 items-center gap-8">
          <div className="col-span-12 lg:col-span-8">
            <h2 className="font-[family:var(--font-home-display)] text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-tight text-[var(--home-foreground)]">
              Stop fighting spreadsheets.
              <span className="block italic text-[var(--home-mint)]">Start comparing.</span>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <Link
              href="/credit-cards/purchases?view=volume"
              className="group flex items-center justify-between bg-[var(--home-mint)] px-6 py-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--home-background)] transition-colors hover:bg-white"
            >
              Enter Taclaro
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>

        <div
          className="mt-12 grid gap-1 opacity-70"
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
    <footer className="pb-6 pt-10">
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-8 px-4 sm:px-6">
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
      <div className="mt-8 border-t border-[var(--home-rule)]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-5 font-[family:var(--font-home-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--home-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>© 2026 Taclaro</div>
          <div />
        </div>
      </div>
    </footer>
  );
}

export function HomepagePrototype({
  navStyle = "dark",
  homeHref = "/",
}: HomepagePrototypeProps) {
  return (
    <div className="min-h-screen bg-[var(--home-background)] text-[var(--home-foreground)]">
      <HomeNav navStyle={navStyle} homeHref={homeHref} />
      <main>
        <HeroSection />
        <ProductsSection />
        <WorkflowSection />
        <LivePulseSection />
        <CallToActionSection />
      </main>
      <FooterSection />
    </div>
  );
}
