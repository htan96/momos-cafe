export type EnvConfiguredRow = {
  label: string;
  envKey: string;
  /** True when the variable is present and non-empty (no value revealed). */
  configured: boolean;
  /** Optional human note; not a live status. */
  note?: string;
};

function isNonEmpty(v: string | undefined): boolean {
  return !!v?.trim();
}

/** Client-build configuration only — presence checks, not connectivity. */
export function getPublicClientIntegrationEnvRows(): EnvConfiguredRow[] {
  const squareApp =
    process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID?.trim() ||
    process.env.NEXT_PUBLIC_SQUARE_APP_ID?.trim();
  return [
    {
      label: "Square checkout (application id)",
      envKey: "NEXT_PUBLIC_SQUARE_APPLICATION_ID or NEXT_PUBLIC_SQUARE_APP_ID",
      configured: isNonEmpty(squareApp),
    },
    {
      label: "Square location",
      envKey: "NEXT_PUBLIC_SQUARE_LOCATION_ID",
      configured: isNonEmpty(process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID),
    },
    {
      label: "Post-login hard navigation",
      envKey: "NEXT_PUBLIC_POST_LOGIN_HARD_NAV",
      configured: process.env.NEXT_PUBLIC_POST_LOGIN_HARD_NAV !== undefined,
      note: "Defaults on when unset; only reports that the knob exists in env.",
    },
    {
      label: "Maintenance contact line",
      envKey: "NEXT_PUBLIC_MAINTENANCE_CONTACT",
      configured: isNonEmpty(process.env.NEXT_PUBLIC_MAINTENANCE_CONTACT),
    },
    {
      label: "Shipping debug",
      envKey: "NEXT_PUBLIC_DEBUG_SHIPPING",
      configured: process.env.NEXT_PUBLIC_DEBUG_SHIPPING === "1",
      note: "Considered configured only when explicitly set to 1.",
    },
  ];
}

export function getShippoEnvRows(): EnvConfiguredRow[] {
  const key = process.env.SHIPPO_API_KEY?.trim();
  const env = process.env.SHIPPO_ENV?.trim();
  return [
    {
      label: "Shippo API key",
      envKey: "SHIPPO_API_KEY",
      configured: isNonEmpty(key),
    },
    {
      label: "Shippo environment label",
      envKey: "SHIPPO_ENV",
      configured: isNonEmpty(env),
      note: env ? undefined : "Optional label used by the Shippo client wrapper.",
    },
  ];
}

export function getImpersonationEnvRows(): EnvConfiguredRow[] {
  const secret = process.env.IMPERSONATION_SECRET?.trim();
  const unsafeDev = process.env.IMPERSONATION_ALLOW_UNSAFE_DEV?.trim() === "true";
  return [
    {
      label: "Impersonation signing secret",
      envKey: "IMPERSONATION_SECRET",
      configured: isNonEmpty(secret) || unsafeDev,
      note: unsafeDev ? "Development fallback enabled via IMPERSONATION_ALLOW_UNSAFE_DEV." : undefined,
    },
  ];
}
