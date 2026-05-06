import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CheckingAccountsDashboard } from "@/components/checking-accounts-dashboard";
import { operationFromSlug } from "@/lib/checking-account-config";

type PageProps = {
  params: Promise<{
    operation: string;
  }>;
  searchParams: Promise<{
    view?: string;
    start?: string;
    end?: string;
    uf?: string;
  }>;
};

export default async function CheckingAccountsOperationPage({ params, searchParams }: PageProps) {
  const { operation } = await params;
  const resolvedOperation = operationFromSlug(operation);

  if (!resolvedOperation) {
    notFound();
  }

  const { view, start, end, uf } = await searchParams;

  return (
    <AppShell section="checking-accounts" activeOperation={operation} queryParams={{ view, start, end, uf }}>
      <CheckingAccountsDashboard
        operation={resolvedOperation}
        initialView={view}
        startMonthParam={start}
        endMonthParam={end}
        ufParam={uf}
      />
    </AppShell>
  );
}
