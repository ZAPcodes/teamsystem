"use client";

import * as React from "react";
import Link from "next/link";
import { NG } from "@/lib/new-genre/tokens";
import type { Offer } from "@/lib/api/contracts";
import { BoxCardButton } from "@/components/perx/box-card-primitives";
import {
  CatalogMediaCard,
  CatalogCardTitle,
  CatalogCardMeta,
  CatalogCardSpacer,
} from "@/components/perx/catalog-media-card";

export interface ProviderGroup {
  providerId: string;
  providerName: string;
  location: string;
  offers: Offer[];
  heroImage: string;
}

export function groupOffersByProvider(offers: Offer[]): ProviderGroup[] {
  const map = new Map<string, ProviderGroup>();
  for (const offer of offers) {
    const key = offer.provider.id;
    const existing = map.get(key);
    if (existing) {
      existing.offers.push(offer);
    } else {
      map.set(key, {
        providerId: key,
        providerName: offer.provider.name,
        location: offer.provider.location,
        offers: [offer],
        heroImage: offer.imageUrl,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.offers.length - a.offers.length);
}

interface ProviderShowcaseCardProps {
  group: ProviderGroup;
  onBrowse?: (providerId: string) => void;
}

export function ProviderShowcaseCard({ group, onBrowse }: ProviderShowcaseCardProps) {
  const count = group.offers.length;
  const category = group.offers[0]?.category;

  return (
    <CatalogMediaCard imageUrl={group.heroImage} imageAlt={group.providerName}>
      <CatalogCardTitle>{group.providerName}</CatalogCardTitle>
      <CatalogCardMeta>
        {category ? `${categoryLabel(category)} · ` : ""}
        {group.location || "Albania"}
      </CatalogCardMeta>

      {onBrowse ? (
        <button
          type="button"
          onClick={() => onBrowse(group.providerId)}
          className="catalog-media-card__link"
        >
          {count} Open Position{count === 1 ? "" : "s"}
        </button>
      ) : (
        <Link href="/marketplace" className="catalog-media-card__link">
          {count} Open Position{count === 1 ? "" : "s"}
        </Link>
      )}

      <CatalogCardSpacer />
      <BoxCardButton onClick={() => onBrowse?.(group.providerId)}>Browse benefits</BoxCardButton>
    </CatalogMediaCard>
  );
}

function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
