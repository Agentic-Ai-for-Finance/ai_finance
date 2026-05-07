import { AppShell } from "@/components/app-shell";
import { CategoryLandingPanel } from "@/components/category-landing-panel";

export default function CheckingAccountsPage() {
  return (
    <AppShell section="checking-accounts">
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
