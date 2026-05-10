"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api-client";
import { useOptionalAuth } from "@/lib/clerk-compat";

type PreferenceResponse = {
  defaultInstitutionCodes: string[];
};

export function useSavedBankPreferences(section: string) {
  const { isSignedIn } = useOptionalAuth();
  const [defaultInstitutionCodes, setDefaultInstitutionCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSignedIn) {
        setDefaultInstitutionCodes([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await getJson<PreferenceResponse>(`/api/v1/preferences/banks?section=${encodeURIComponent(section)}`);
        if (!cancelled) {
          setDefaultInstitutionCodes(response.defaultInstitutionCodes);
        }
      } catch {
        if (!cancelled) {
          setDefaultInstitutionCodes([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, section]);

  return {
    defaultInstitutionCodes,
    isLoading,
  };
}
