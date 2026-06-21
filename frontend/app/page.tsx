"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/session";
import { primaryRoleHome } from "@/lib/auth/use-require-role";

/**
 * Root redirect — role-aware.
 * Waits for Zustand hydration, then sends the user to their first role home,
 * or to /login if unauthenticated.
 */
export default function RootPage() {
  const router = useRouter();
  const { token, user, _hasHydrated } = useSessionStore();

  React.useEffect(() => {
    if (!_hasHydrated) return;
    if (!token || !user) {
      router.replace("/login");
    } else {
      router.replace(primaryRoleHome(user.roles));
    }
  }, [_hasHydrated, token, user, router]);

  return null;
}
