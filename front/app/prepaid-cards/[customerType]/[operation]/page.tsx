import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PrepaidCardsDashboard } from "@/components/prepaid-cards-dashboard";
import { customerTypeFromSlug, operationFromSlug } from "@/lib/prepaid-card-config";

type PageProps = {
  params: Promise<{
    customerType: string;
    operation: string;
  }>;
  searchParams: Promise<{
    view?: string;
    start?: string;
    end?: string;
    uf?: string;
  }>;
};

export default async function PrepaidCardsOperationPage({ params, searchParams }: PageProps) {
  const { customerType, operation } = await params;
  const resolvedCustomerType = customerTypeFromSlug(customerType);
  const resolvedOperation = operationFromSlug(operation);

  if (!resolvedCustomerType || !resolvedOperation) {
    notFound();
  }

  const { view, start, end, uf } = await searchParams;

  return (
    <AppShell
      section="prepaid-cards"
      activeOperation={`${customerType}/${operation}`}
      queryParams={{ view, start, end, uf }}
    >
      <PrepaidCardsDashboard
        customerType={resolvedCustomerType}
        operation={resolvedOperation}
        initialView={view}
        startMonthParam={start}
        endMonthParam={end}
        ufParam={uf}
      />
    </AppShell>
  );
}
