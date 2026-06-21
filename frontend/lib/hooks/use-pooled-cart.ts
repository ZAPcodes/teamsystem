"use client";

import { apiGet, apiPost } from "@/lib/api/client";
import type { PooledCartDTO } from "@/lib/api/contracts";

export async function createPooledCart(offerId: string, initialCommit: number) {
  return apiPost<{ cart: PooledCartDTO }>("/pooled-carts", { offerId, initialCommit });
}

export async function getPooledCartByInvite(inviteCode: string) {
  return apiGet<{ cart: PooledCartDTO }>(`/pooled-carts/invite/${encodeURIComponent(inviteCode)}`);
}

export async function commitToPooledCart(inviteCode: string, amount: number) {
  return apiPost<{ cart: PooledCartDTO }>(
    `/pooled-carts/invite/${encodeURIComponent(inviteCode)}/commit`,
    { amount }
  );
}

export async function cancelPooledCart(cartId: string) {
  return apiPost<{ cart: PooledCartDTO }>(`/pooled-carts/${cartId}/cancel`, {});
}
