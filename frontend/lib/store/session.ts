"use client";
// Zustand session store — persisted to localStorage as perx-session-v1.
// Use getState() outside React (e.g. in API client).
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserDTO } from "@/lib/api/contracts";

interface SessionStore {
  token: string | null;
  user: UserDTO | null;
  /** True once localStorage has been rehydrated. Use to avoid redirect flicker. */
  _hasHydrated: boolean;
  setSession: (token: string, user: UserDTO) => void;
  clearSession: () => void;
  _setHasHydrated: (v: boolean) => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      _hasHydrated: false,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "perx-session-v1",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          // SSR stub — never persists
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    }
  )
);
