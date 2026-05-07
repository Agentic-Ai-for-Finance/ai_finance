import { AppShell } from "@/components/app-shell";
import { CategoryLandingPanel } from "@/components/category-landing-panel";

export default function DebitCardsPage() {
  return (
    <AppShell section="debit-cards">
      <CategoryLandingPanel
        title="Debit Cards"
        description="Explore banks' debit-cards and ATM-only-cards performance across time to get insights for your business."
        subcategories={["Debit Transactions", "ATM Withdrawals", "Operation Metrics"]}
        dataAvailability="From 12/2012 to 02/2026 and updating"
        keyPoints={[
          "This section combines debit-card and ATM-only card bases for operational ratios.",
          "Metrics including $CLP metrics are deflated using today's UF or an UF value set by you",
        ]}
        dataSource={["CMF"]}
      />
    </AppShell>
  );
}
