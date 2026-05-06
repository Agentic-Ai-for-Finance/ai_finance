import { redirect } from "next/navigation";

type PrepaidCardsPageProps = {
  searchParams: Promise<{
    view?: string;
    start?: string;
    end?: string;
    uf?: string;
  }>;
};

export default async function PrepaidCardsPage({ searchParams }: PrepaidCardsPageProps) {
  const { view, start, end, uf } = await searchParams;
  const params = new URLSearchParams();
  if (view) params.set("view", view);
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  if (uf) params.set("uf", uf);
  const query = params.toString();

  redirect(`/prepaid-cards/natural-person/purchases${query ? `?${query}` : ""}`);
}
