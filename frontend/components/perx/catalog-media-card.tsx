"use client";

import * as React from "react";
import { NG } from "@/lib/new-genre/tokens";

interface CatalogMediaCardProps {
  imageUrl?: string | null;
  imageAlt: string;
  logoUrl?: string | null;
  logoAlt?: string;
  badge?: React.ReactNode;
  heroAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

/**
 * Shared marketplace catalog card shell: tall hero image + overlapping logo sticker.
 */
export function CatalogMediaCard({
  imageUrl,
  imageAlt,
  logoUrl,
  logoAlt,
  badge,
  heroAction,
  children,
  className,
  elevated = false,
}: CatalogMediaCardProps) {
  const hero = imageUrl?.trim() || null;
  const logo = (logoUrl ?? imageUrl)?.trim() || null;

  return (
    <article
      className={[
        "ng-box-card",
        "ng-box-card--media",
        "catalog-media-card",
        elevated ? "ng-box-card--elevated" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="catalog-media-card__hero">
        <div className="catalog-media-card__hero-frame">
          {hero ? (
            <img src={hero} alt={imageAlt} className="catalog-media-card__hero-image" />
          ) : (
            <div className="catalog-media-card__hero-fallback" aria-hidden="true">
              {imageAlt.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="catalog-media-card__logo">
          {logo ? (
            <img src={logo} alt={logoAlt ?? imageAlt} className="catalog-media-card__logo-image" />
          ) : (
            <span className="catalog-media-card__logo-fallback" aria-hidden="true">
              {(logoAlt ?? imageAlt).charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {badge ? <div className="catalog-media-card__badge">{badge}</div> : null}
        {heroAction ? <div className="catalog-media-card__hero-action">{heroAction}</div> : null}
      </div>

      <div className="catalog-media-card__body">{children}</div>
    </article>
  );
}

export function CatalogMediaCardSkeleton({ elevated = false }: { elevated?: boolean }) {
  return (
    <div
      className={[
        "ng-box-card",
        "catalog-media-card",
        "catalog-media-card--skeleton",
        elevated ? "ng-box-card--elevated" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <div className="catalog-media-card__hero shimmer" />
      <div className="catalog-media-card__body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="shimmer" style={{ height: "22px", width: "75%", borderRadius: "6px" }} />
        <div className="shimmer" style={{ height: "14px", width: "55%", borderRadius: "6px" }} />
        <div className="shimmer" style={{ height: "44px", width: "100%", borderRadius: "8px", marginTop: "8px" }} />
      </div>
    </div>
  );
}

interface CatalogCardTitleProps {
  children: React.ReactNode;
}

export function CatalogCardTitle({ children }: CatalogCardTitleProps) {
  return <h3 className="catalog-media-card__title">{children}</h3>;
}

interface CatalogCardMetaProps {
  children: React.ReactNode;
}

export function CatalogCardMeta({ children }: CatalogCardMetaProps) {
  return <p className="catalog-media-card__meta">{children}</p>;
}

export function CatalogCardSpacer() {
  return <div style={{ flex: 1, minHeight: "8px" }} />;
}
