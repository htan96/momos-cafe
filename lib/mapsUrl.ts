"use client";

import { useState, useEffect } from "react";

/**
 * Momo's Café address for maps links.
 */
export const MOMOS_ADDRESS = "1922 Broadway St, Vallejo, CA 94589";

export const GOOGLE_MAPS_URL = `https://www.google.com/maps/place/${MOMOS_ADDRESS.replace(/\s+/g, "+")}`;
const APPLE_MAPS_URL = `https://maps.apple.com/?q=${encodeURIComponent(MOMOS_ADDRESS)}`;

/**
 * Returns true if the user agent suggests an Apple device (iPhone, iPad, Mac).
 */
function isAppleDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(navigator.userAgent);
}

/**
 * Returns the appropriate maps URL for the current device:
 * - Apple Maps on iPhone, iPad, iPod, Mac
 * - Google Maps otherwise
 */
export function getMapsUrl(): string {
  return isAppleDevice() ? APPLE_MAPS_URL : GOOGLE_MAPS_URL;
}

/**
 * Hook that returns the maps URL for the current device.
 * Uses Google Maps for SSR/initial render to avoid hydration mismatch,
 * then updates to Apple Maps on Apple devices after mount.
 */
export function useMapsUrl(): string {
  const [url, setUrl] = useState(GOOGLE_MAPS_URL);
  useEffect(() => {
    setUrl(getMapsUrl());
  }, []);
  return url;
}
