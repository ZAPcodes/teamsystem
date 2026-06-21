"use client";
import * as React from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api/client";
import type { ProviderCompanyDTO, ProviderEarningsDTO, OfferDTO } from "@/lib/api/contracts";

export function useProviderCompany() {
  const [data, setData] = React.useState<ProviderCompanyDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<ProviderCompanyDTO>("/provider/company");
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

export function useProviderOffers() {
  const [offers, setOffers] = React.useState<OfferDTO[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOffers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ offers: OfferDTO[] }>("/provider/offers");
      setOffers(res.offers);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void fetchOffers(); }, [fetchOffers]);

  const createOffer = async (payload: {
    title: string;
    description: string;
    category: string;
    price: number;
    currency: string;
    imageUrl?: string;
    isLimited?: boolean;
    expiresAt?: string;
  }) => {
    const res = await apiPost<{ offer: OfferDTO }>("/provider/offers", payload);
    await fetchOffers();
    return res.offer;
  };

  const updateOffer = async (id: string, payload: Partial<{
    title: string;
    description: string;
    category: string;
    price: number;
    currency: string;
    imageUrl: string;
    isLimited: boolean;
    expiresAt: string;
  }>) => {
    const res = await apiPatch<{ offer: OfferDTO }>(`/provider/offers/${id}`, payload);
    await fetchOffers();
    return res.offer;
  };

  const deleteOffer = async (id: string) => {
    await apiDelete(`/provider/offers/${id}`);
    await fetchOffers();
  };

  return { offers, loading, error, refetch: fetchOffers, createOffer, updateOffer, deleteOffer };
}

export function useProviderEarnings() {
  const [earnings, setEarnings] = React.useState<ProviderEarningsDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<ProviderEarningsDTO>("/provider/earnings");
        if (!cancelled) setEarnings(res);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { earnings, loading, error };
}
