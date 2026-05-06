import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { checkingAccountOperationLabelMap, operationFromSlug } from "@/lib/checking-account-config";

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
      <PlaceholderPanel
        title="Checking Accounts"
        description={`${checkingAccountOperationLabelMap[resolvedOperation]} dashboard will be enabled in the next phase.`}
      />
    </AppShell>
  );
}
