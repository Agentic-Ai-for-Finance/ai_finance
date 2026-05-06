import { AppShell } from "@/components/app-shell";
import { PlaceholderPanel } from "@/components/placeholder-panel";

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
      <PlaceholderPanel
        title="Checking Accounts"
        description="Select one checking-account category from the sidebar to open the dashboard."
      />
    </AppShell>
  );
}
