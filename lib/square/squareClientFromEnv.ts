import { SquareClient, SquareEnvironment } from "square";

/** Same environment resolution as storefront checkout (`SQUARE_ACCESS_TOKEN`, `SQUARE_ENVIRONMENT`). */
export function resolveSquareClientFromEnv(): SquareClient | null {
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!token) return null;
  const isProduction = process.env.SQUARE_ENVIRONMENT === "production";
  return new SquareClient({
    token,
    environment: isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });
}
