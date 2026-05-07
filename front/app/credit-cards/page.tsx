import { AppShell } from "@/components/app-shell";
import { CategoryLandingPanel } from "@/components/category-landing-panel";

type CreditCardsPageProps = {
  searchParams: Promise<{
    view?: string;
    start?: string;
    end?: string;
    uf?: string;
  }>;
};

export default async function CreditCardsPage({ searchParams }: CreditCardsPageProps) {
  const { view, start, end, uf } = await searchParams;

  return (
    <AppShell section="credit-cards" queryParams={{ view, start, end, uf }}>
      <CategoryLandingPanel
        title="Credit Cards"
        description="Explore banks' and non-banks' credit-cards performance across time to get insights for your business. Choose one metric to open the full dashboard with filters and comparisons."
        subcategories={["Purchases", "Cash Advances", "Fees", "Operation Metrics"]}
        dataAvailability="From 04/2009 to 02/2026 and updating"
        keyPoints={[
          "Metrics including $CLP metrics are deflated using today's UF or an UF value set by you",
        ]}
        dataSource={["CMF"]}
      />
    </AppShell>
  );
}
