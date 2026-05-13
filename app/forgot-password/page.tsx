import { redirect } from "next/navigation";

/** Clean URL — composition lives under `/auth/cognito/forgot-password`. */
export default async function ForgotPasswordAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") q.set(k, v);
    else if (Array.isArray(v)) {
      for (const item of v) q.append(k, item);
    }
  }
  const suffix = q.toString();
  redirect(
    suffix ? `/auth/cognito/forgot-password?${suffix}` : "/auth/cognito/forgot-password"
  );
}
