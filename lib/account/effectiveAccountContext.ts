import { prisma } from "@/lib/prisma";

/**
 * Resolves `CommerceOrder.customerId` (Prisma `Customer.id`) from Cognito subject and/or email.
 * Used by account dashboards so loaders use normalized UUID keys instead of raw JWT `sub` alone.
 */
export async function resolveCommerceCustomerId(input: {
  cognitoSub: string;
  email: string;
}): Promise<string | null> {
  const sub = input.cognitoSub.trim();
  const email = input.email.trim().toLowerCase();
  if (!sub && !email) return null;

  if (sub && sub !== "governance-preview") {
    const bySub = await prisma.customer.findFirst({
      where: { externalAuthSubject: sub },
      select: { id: true },
    });
    if (bySub) return bySub.id;
  }

  if (email) {
    const byEmail = await prisma.customer.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  return null;
}
