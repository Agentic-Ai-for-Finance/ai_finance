import { AppShell } from "@/components/app-shell";

type LoansPageProps = {
  searchParams: Promise<{
    view?: string;
    start?: string;
    end?: string;
    uf?: string;
  }>;
};

export default async function LoansPage({ searchParams }: LoansPageProps) {
  const { view, start, end, uf } = await searchParams;

  return (
    <AppShell section="loans" queryParams={{ view, start, end, uf }}>
      <section className="rounded-3xl border border-border bg-panel p-8">
        <h1 className="text-3xl font-semibold text-white">Loans</h1>
        <p className="mt-4 text-lg italic text-muted">Soon</p>
      </section>
    </AppShell>
  );
}
