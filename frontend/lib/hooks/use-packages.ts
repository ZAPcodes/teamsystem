"use client";

import { apiPost } from "@/lib/api/client";
import type { PackageDTO, SubmitPackageResponseDTO } from "@/lib/api/contracts";

export async function createAndSubmitPackage(
  offerIds: string[],
  options?: { shareToFeed?: boolean }
): Promise<SubmitPackageResponseDTO> {
  const created = await apiPost<{ package: PackageDTO }>("/packages", {
    offerIds,
    source: "manual",
  });

  return apiPost<SubmitPackageResponseDTO>(`/packages/${created.package.id}/submit`, {
    shareToFeed: options?.shareToFeed === true,
  });
}
