import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";

/**
 * GET /api/square/verify
 * Verifies Square configuration by listing locations.
 * Use this to confirm SQUARE_LOCATION_ID exists and matches your environment.
 */
export async function GET() {
  try {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const environmentRaw = process.env.SQUARE_ENVIRONMENT;
    const isProduction = environmentRaw === "production";
    const environment = isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox;

    if (!accessToken || !locationId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID",
          config: {
            hasAccessToken: !!accessToken,
            hasLocationId: !!locationId,
          },
        },
        { status: 500 }
      );
    }

    const client = new SquareClient({ token: accessToken, environment });
    const response = await client.locations.list();
    const res = response as { result?: { locations?: unknown[] }; body?: { locations?: unknown[] } };
    const locationsList = (res?.result?.locations ?? res?.body?.locations ?? []) as { id?: string; name?: string; address?: { addressLine1?: string; locality?: string; administrativeDistrictLevel1?: string } }[];
    const locations = locationsList.map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address
        ? `${loc.address.addressLine1 ?? ""}, ${loc.address.locality ?? ""} ${loc.address.administrativeDistrictLevel1 ?? ""}`.trim()
        : null,
    }));

    const configuredLocationExists = locations.some((loc) => loc.id === locationId);

    return NextResponse.json({
      ok: true,
      environment: isProduction ? "production" : "sandbox",
      configuredLocationId: locationId,
      configuredLocationExists,
      locationCount: locations.length,
      locations,
      hint: !configuredLocationExists
        ? "SQUARE_LOCATION_ID does not match any location in this Square account. Copy a valid id from the 'locations' array above and set it in both SQUARE_LOCATION_ID and NEXT_PUBLIC_SQUARE_LOCATION_ID."
        : "Configuration appears valid. Ensure NEXT_PUBLIC_SQUARE_LOCATION_ID equals SQUARE_LOCATION_ID and NEXT_PUBLIC_SQUARE_ENVIRONMENT equals SQUARE_ENVIRONMENT.",
    });
  } catch (err: unknown) {
    const e = err as { errors?: unknown[]; body?: { errors?: unknown[] } };
    const squareErrors = e?.errors ?? e?.body?.errors;
    const first = Array.isArray(squareErrors) ? (squareErrors[0] as { code?: string; detail?: string }) : null;
    return NextResponse.json(
      {
        ok: false,
        error: first?.detail ?? (err instanceof Error ? err.message : "Square API error"),
        code: first?.code,
      },
      { status: 500 }
    );
  }
}
