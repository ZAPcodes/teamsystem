"use client";
// Route guard hook. Use at the top of role-specific layouts.
// Waits for Zustand hydration before redirecting to avoid flash.
import * as React from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/session";
import type { Role } from "@/lib/api/contracts";

const ROLE_PRIORITY: Role[] = ["employer_admin", "provider_admin", "employee"];

function roleHome(role: Role): string {
  if (role === "employee") return "/marketplace";
  if (role === "employer_admin") return "/employer";
  if (role === "provider_admin") return "/provider";
  return "/login";
}

/** Prefer admin portals when a user has multiple roles (e.g. employee + employer_admin). */
export function primaryLoginRole(roles: Role[]): Role | undefined {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return roles[0];
}

export function primaryRoleHome(roles: Role[]): string {
  const role = primaryLoginRole(roles);
  return role ? roleHome(role) : "/login";
}

export function useRequireRole(requiredRole: Role) {
  const router = useRouter();
  const { token, user, _hasHydrated } = useSessionStore();

  React.useEffect(() => {
    if (!_hasHydrated) return;

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (!user.roles.includes(requiredRole)) {
      router.replace(primaryRoleHome(user.roles));
    }
  }, [_hasHydrated, token, user, requiredRole, router]);

  const isAuthorized = !!user?.roles.includes(requiredRole);
  const isLoading = !_hasHydrated;

  return { user, token, isAuthorized, isLoading };
}

export { roleHome };
