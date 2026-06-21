"use client";
import * as React from "react";
import { apiGet } from "@/lib/api/client";
import type { AllowanceDTO } from "@/lib/api/contracts";

export function useAllowance() {
  const [allowance, setAllowance] = React.useState<AllowanceDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAllowance = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ allowance: AllowanceDTO }>("/me/allowance", signal);
      setAllowance(data.allowance);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message ?? "Failed to load allowance");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchAllowance(controller.signal);
    return () => controller.abort();
  }, [fetchAllowance]);

  return { allowance, loading, error, refetch: fetchAllowance };
}
