import { AppShell } from "@/components/app-shell";
import { CategoryLandingPanel } from "@/components/category-landing-panel";

type CheckingAccountsPageProps = {
  searchParams: Promise<{
    view?: string;
    start?: string;
    end?: string;
    uf?: string;
  }>;
};

export default async function CheckingAccountsPage({ searchParams }: CheckingAccountsPageProps) {
  const { view, start, end, uf } = await searchParams;

  return (
    <AppShell section="checking-accounts" queryParams={{ view, start, end, uf }}>
      <CategoryLandingPanel
        title="Checking Accounts"
        description="Explore banks' checking-account performance by account category to get insights for your business"
        subcategories={[
          "Natural Person Without Interest",
          "Natural Person With Interest",
          "Business Without Interest",
          "Business With Interest",
        ]}
        dataAvailability="Category metrics: 01/2011 to 02/2026 and updating"
        keyPoints={[
          "Metrics including $CLP metrics are deflated using today's UF or an UF value set by you",
        ]}
      />
    </AppShell>
  );
}
