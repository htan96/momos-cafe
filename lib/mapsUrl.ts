"use client";

import { useState, useEffect, useMemo } from "react";
import { useAdminSettings, DEFAULT_SETTINGS } from "@/lib/useAdminSettings";
import { formatBusinessAddressOneLine } from "@/lib/businessLocation";

function isAppleDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(navigator.userAgent);
}

/** Stable fallback maps query — aligned with {@link DEFAULT_SETTINGS.businessLocation}. */
export function defaultMapsAddressOneLine(): string {
  return formatBusinessAddressOneLine(DEFAULT_SETTINGS.businessLocation);
}

export function buildGoogleMapsPlaceUrl(oneLineAddress: string): string {
  return `https://www.google.com/maps/place/${oneLineAddress.replace(/\s+/g, "+")}`;
}

export function buildAppleMapsSearchUrl(oneLineAddress: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(oneLineAddress)}`;
}

/** @deprecated Prefer Ops-backed {@link useMapsUrl} — kept for legacy imports */
export const MOMOS_ADDRESS = defaultMapsAddressOneLine();

export const GOOGLE_MAPS_URL = buildGoogleMapsPlaceUrl(MOMOS_ADDRESS);

export function getMapsUrlForAddress(oneLineAddress: string): string {
  return isAppleDevice()
    ? buildAppleMapsSearchUrl(oneLineAddress)
    : buildGoogleMapsPlaceUrl(oneLineAddress);
}

export function useMapsUrl(): string {
  const { settings } = useAdminSettings();
  const line = useMemo(
    () => formatBusinessAddressOneLine(settings.businessLocation ?? DEFAULT_SETTINGS.businessLocation),
    [settings.businessLocation]
  );

  const [url, setUrl] = useState(() => buildGoogleMapsPlaceUrl(line));

  useEffect(() => {
    setUrl(getMapsUrlForAddress(line));
  }, [line]);

  return url;
}
