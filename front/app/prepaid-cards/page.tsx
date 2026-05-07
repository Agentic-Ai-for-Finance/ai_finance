import { AppShell } from "@/components/app-shell";
import { CategoryLandingPanel } from "@/components/category-landing-panel";

export default function PrepaidCardsPage() {
  return (
    <AppShell section="prepaid-cards">
      <CategoryLandingPanel
        title="Prepaid Cards"
        description="Review prepaid-card metrics for natural-person and business issuers."
        subcategories={[
          "Natural Person: Purchases",
          "Natural Person: Utilities",
          "Natural Person: ATM Withdrawals",
          "Natural Person: Operation Metrics",
          "Business: Purchases",
          "Business: Utilities",
          "Business: ATM Withdrawals",
          "Business: Operation Metrics",
        ]}
        dataAvailability="From 12/2019 to 02/2026 and updating"
        keyPoints={[
          "Metrics including $CLP metrics are deflated using today's UF or an UF value set by you",
        ]}
        dataSource={["CMF"]}
      />
    </AppShell>
  );
}
