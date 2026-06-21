"use client";
import * as React from "react";
import { apiGet } from "@/lib/api/client";
import { offerDTOtoOffer } from "@/lib/api/contracts";
import type { Offer, OfferDTO, DropDTO, FeedMeta } from "@/lib/api/contracts";

interface UseOffersOpts {
  category?: string;
  q?: string;
}

export function useOffers({ category, q }: UseOffersOpts = {}) {
  const [offers, setOffers] = React.useState<Offer[] | null>(null);
  const [feedMeta, setFeedMeta] = React.useState<FeedMeta | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOffers = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category && category !== "all") params.set("category", category);
      if (q) params.set("q", q);
      const qs = params.toString() ? `?${params}` : "";
      const data = await apiGet<{ offers: OfferDTO[]; feedMeta?: FeedMeta }>(`/offers${qs}`, signal);
      setOffers(data.offers.filter((o) => o.isActive).map(offerDTOtoOffer));
      setFeedMeta(data.feedMeta ?? null);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message ?? "Failed to load offers");
      }
    } finally {
      setLoading(false);
    }
  }, [category, q]);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchOffers(controller.signal);
    return () => controller.abort();
  }, [fetchOffers]);

  return { offers, feedMeta, loading, error, refetch: fetchOffers };
}

export function useDrops() {
  const [drops, setDrops] = React.useState<DropDTO[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await apiGet<{ drops: DropDTO[] }>("/offers/drops", controller.signal);
        setDrops(data.drops);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message ?? "Failed to load drops");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return { drops, loading, error };
}
