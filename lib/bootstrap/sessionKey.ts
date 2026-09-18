/** Edge-safe HS256 key material (UTF-8 bytes; use a 32+ char secret in production). */
export function bootstrapSessionHmacKeyMaterial(): Uint8Array {
  const raw =
    process.env.SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.INTERNAL_API_SECRET?.trim();
  if (!raw?.length) {
    throw new Error(
      "SESSION_SECRET, AUTH_SECRET, or INTERNAL_API_SECRET required for bootstrap admin sessions"
    );
  }
  return new TextEncoder().encode(raw);
}
