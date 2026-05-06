import { redirect } from "next/navigation";

type AccountsPageProps = {
  searchParams: Promise<{
    view?: string;
    start?: string;
    end?: string;
    uf?: string;
  }>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const { view, start, end, uf } = await searchParams;
  const params = new URLSearchParams();
  if (view) params.set("view", view);
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  if (uf) params.set("uf", uf);
  const query = params.toString();

  redirect(`/checking-accounts${query ? `?${query}` : ""}`);
}
