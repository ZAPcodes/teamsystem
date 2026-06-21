import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category } from "@/lib/api/contracts";

export type PersonalityType = "adventurous" | "social" | "introverted" | "growth";

export interface PersonalityResult {
  type: PersonalityType;
  title: string;
  summary: string;
  recommendedCategories: Exclude<Category, "all">[];
  completedAt: string;
}

interface PersonalityStore {
  result: PersonalityResult | null;
  saveResult: (result: PersonalityResult) => void;
  clearResult: () => void;
}

export const PERSONALITY_PROFILES: Record<
  PersonalityType,
  Omit<PersonalityResult, "type" | "completedAt">
> = {
  adventurous: {
    title: "Adventurous Explorer",
    summary: "You lean toward fresh scenery, movement, and perks that turn a regular week into a small expedition.",
    recommendedCategories: ["travel", "wellness", "lifestyle"],
  },
  social: {
    title: "Social Connector",
    summary: "You get energy from shared tables, nights out, and perks that are easy to enjoy with other people.",
    recommendedCategories: ["food", "lifestyle", "travel"],
  },
  introverted: {
    title: "Quiet Recharger",
    summary: "You prefer perks that help you slow down, reset, and enjoy something restorative at your own pace.",
    recommendedCategories: ["learning", "wellness", "food"],
  },
  growth: {
    title: "Curious Builder",
    summary: "You are drawn to skills, habits, and practical upgrades that make future-you a little better equipped.",
    recommendedCategories: ["learning", "wellness", "lifestyle"],
  },
};

export const usePersonalityStore = create<PersonalityStore>()(
  persist(
    (set) => ({
      result: null,
      saveResult: (result) => set({ result }),
      clearResult: () => set({ result: null }),
    }),
    { name: "perx-personality-result-v1" }
  )
);
