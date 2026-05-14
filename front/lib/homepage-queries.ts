import { getJson } from "@/lib/api-client";

export type HomepageHeroBar = {
  name: string;
  value: number;
  growth: string;
};

export type HomepageLivePulseCase = {
  product: string;
  volume: string;
  growth: string;
};

export type HomepageMetricsPayload = {
  heroMonthLabel: string;
  heroBars: HomepageHeroBar[];
  livePulseMonthLabel: string;
  livePulseCases: HomepageLivePulseCase[];
};

export async function fetchHomepageMetrics(): Promise<HomepageMetricsPayload> {
  return getJson<HomepageMetricsPayload>("/api/v1/public/homepage");
}
