import { SquareClient, SquareEnvironment } from "square";

/** Production Square ONLY — Store catalog sync and payments target live seller catalog */
export function requireProductionSquareClient(): SquareClient {
  const env = (process.env.SQUARE_ENVIRONMENT ?? "").trim().toLowerCase();
  if (env !== "production") {
    throw new Error(
      `Square Store integration requires SQUARE_ENVIRONMENT=production (got "${env || "unset"}").`
    );
  }
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("SQUARE_ACCESS_TOKEN is required for Square integration.");
  }
  return new SquareClient({
    token,
    environment: SquareEnvironment.Production,
  });
}
