import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Offer } from "@/lib/api/contracts";

// ---- Types -------------------------------------------------------

export interface PackageLine {
  id: string;
  offerId: string;
  providerId: string;
  providerName: string;
  offerTitle: string;
  /** Price in ALL at time of add — snapshot, not live */
  price: number;
  currency: "ALL";
  imageUrl: string;
}

interface PackageStore {
  lines: PackageLine[];
  source: "manual" | "ai";
  aiReason: string | null;
  pendingOpenBuilder: boolean;
  addLine: (offer: Offer) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
  setSource: (source: "manual" | "ai", reason?: string) => void;
  requestOpenBuilder: () => void;
  consumeOpenBuilder: () => boolean;
  getSubmitPayload: () => { offerIds: string[] };
}

// ---- Store -------------------------------------------------------

export const usePackageStore = create<PackageStore>()(
  persist(
    (set, get) => ({
      lines: [],
      source: "manual",
      aiReason: null,
      pendingOpenBuilder: false,

      addLine: (offer) =>
        set((state) => {
          // Deduplicate by offerId
          if (state.lines.some((l) => l.offerId === offer.id)) return state;
          const line: PackageLine = {
            id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            offerId: offer.id,
            providerId: offer.provider.id,
            providerName: offer.provider.name,
            offerTitle: offer.title,
            price: offer.priceALL,
            currency: "ALL",
            imageUrl: offer.imageUrl,
          };
          return { lines: [...state.lines, line] };
        }),

      removeLine: (lineId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.id !== lineId) })),

      clear: () => set({ lines: [], source: "manual", aiReason: null }),

      setSource: (source, reason) => set({ source, aiReason: reason ?? null }),

      requestOpenBuilder: () => set({ pendingOpenBuilder: true }),

      consumeOpenBuilder: () => {
        const pending = get().pendingOpenBuilder;
        if (pending) set({ pendingOpenBuilder: false });
        return pending;
      },

      // The only thing the backend needs to materialise the package.
      // NOTE: the canonical total and validation happen server-side on submit.
      getSubmitPayload: () => ({ offerIds: get().lines.map((l) => l.offerId) }),
    }),
    { name: "perx-package-draft-v1", partialize: (state) => ({
      lines: state.lines,
      source: state.source,
      aiReason: state.aiReason,
    }) },
  )
);

// ---- Selectors ---------------------------------------------------

/**
 * Display-only total in ALL.
 * The canonical total is computed by the backend when the package is submitted.
 * Do not use this value for any business logic.
 */
export const selectDisplayTotal = (state: PackageStore): number =>
  state.lines.reduce((sum, l) => sum + l.price, 0);

export const selectLineCount = (state: PackageStore): number =>
  state.lines.length;

export const selectHasOffer = (offerId: string) => (state: PackageStore): boolean =>
  state.lines.some((l) => l.offerId === offerId);
