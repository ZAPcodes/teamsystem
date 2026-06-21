"use client";
import * as React from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { apiPatch } from "@/lib/api/client";
import type {
  EmployerCompanyDTO,
  EmployeeWithAllowanceDTO,
  EmployerInsightsDTO,
  UpdateEmployerPolicyRequest,
  ComplianceReviewDTO,
  QuestDTO,
  CreateQuestRequest,
} from "@/lib/api/contracts";

export function useEmployerCompany() {
  const [data, setData] = React.useState<EmployerCompanyDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetch_ = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<EmployerCompanyDTO>("/employer/company");
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void fetch_(); }, [fetch_]); // eslint-disable-line react-hooks/set-state-in-effect

  const fundWallet = async (amount: number): Promise<{ company: { walletBalance: number; currency: string; id: string } }> => {
    const res = await apiPost<{ company: { walletBalance: number; currency: string; id: string } }>(
      "/employer/wallet/fund",
      { amount }
    );
    // Optimistically update local state
    if (data) {
      setData({ ...data, company: { ...data.company, walletBalance: res.company.walletBalance } });
    }
    return res;
  };
  const updatePolicy = async (policy: UpdateEmployerPolicyRequest): Promise<EmployerCompanyDTO> => {
    const res = await apiPatch<EmployerCompanyDTO>("/employer/policy", policy);
    setData(res);
    return res;
  };

  return { data, loading, error, refetch: fetch_, fundWallet, updatePolicy };
}

export function useEmployerEmployees() {
  const [employees, setEmployees] = React.useState<EmployeeWithAllowanceDTO[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<{ employees: EmployeeWithAllowanceDTO[] }>("/employer/employees");
        if (!cancelled) setEmployees(res.employees);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { employees, loading, error };
}

export function useEmployerInsights() {
  const [insights, setInsights] = React.useState<EmployerInsightsDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<EmployerInsightsDTO>("/employer/insights");
        if (!cancelled) setInsights(res);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { insights, loading, error };
}

export function useEmployerBenefitRequests() {
  const [requests, setRequests] = React.useState<import("@/lib/api/contracts").BenefitRequestDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ requests: import("@/lib/api/contracts").BenefitRequestDTO[] }>(
        "/employer/benefit-requests"
      );
      setRequests(res.requests);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const decide = async (id: string, status: "approved" | "declined", employerNote?: string) => {
    await apiPost(`/employer/benefit-requests/${id}/decide`, { status, employerNote });
    await refresh();
  };

  return { requests, loading, error, refresh, decide };
}

export function useEmployerComplianceReviews() {
  const [reviews, setReviews] = React.useState<ComplianceReviewDTO[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetch_ = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ reviews: ComplianceReviewDTO[] }>(
        "/employer/compliance-reviews?status=pending_manual_approval"
      );
      setReviews(res.reviews);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetch_();
  }, [fetch_]);

  const decide = async (id: string, decision: "approved" | "rejected") => {
    await apiPost(`/employer/compliance-reviews/${id}/decide`, { decision });
    setReviews((current) => current?.filter((review) => review.id !== id) ?? current);
  };

  return { reviews, loading, error, refetch: fetch_, decide };
}

export function useEmployerQuests() {
  const [quests, setQuests] = React.useState<QuestDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ quests: QuestDTO[] }>("/employer/quests");
      setQuests(res.quests);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const createQuest = async (input: CreateQuestRequest) => {
    const res = await apiPost<{ quest: QuestDTO }>("/employer/quests", input);
    setQuests((current) => [res.quest, ...current]);
    return res.quest;
  };

  return { quests, loading, error, refresh, createQuest };
}
