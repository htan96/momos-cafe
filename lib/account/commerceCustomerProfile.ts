import { prisma } from "@/lib/prisma";
import { isCustomer } from "@/lib/auth/cognito/roles";

/**
 * Normalizes storefront identity into the Prisma `Customer` row (`externalAuthSubject` = Cognito `sub`).
 * Attaches Cognito sub to an email-only legacy row only when `externalAuthSubject` on that row is empty.
 */
export async function ensureCommerceCustomer(input: { cognitoSub: string; email: string }): Promise<string | null> {
  const cognitoSub = input.cognitoSub.trim();
  const email = input.email.trim().toLowerCase();
  if (!cognitoSub || cognitoSub === "governance-preview" || !email) return null;

  const bySub = await prisma.customer.findUnique({
    where: { externalAuthSubject: cognitoSub },
    select: { id: true, email: true },
  });
  const byEmail = await prisma.customer.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, externalAuthSubject: true },
  });

  if (bySub) {
    if (bySub.email?.toLowerCase() !== email) {
      await prisma.customer.update({
        where: { id: bySub.id },
        data: { email },
      });
    }
    return bySub.id;
  }

  if (byEmail) {
    const rowSub = byEmail.externalAuthSubject?.trim();
    if (!rowSub) {
      return (
        await prisma.customer.update({
          where: { id: byEmail.id },
          data: { externalAuthSubject: cognitoSub, email },
          select: { id: true },
        })
      ).id;
    }
    if (rowSub !== cognitoSub) {
      console.warn("[ensureCommerceCustomer] email_already_bound_other_subject", { email });
      return null;
    }
    return byEmail.id;
  }

  const row = await prisma.customer.create({
    data: { email, externalAuthSubject: cognitoSub },
    select: { id: true },
  });
  return row.id;
}

/** Paid guest checkouts store `metadata.storefrontCheckoutEmail` at payment reconcile time; link after signup. */
export async function linkGuestCommerceOrdersByCheckoutEmail(
  customerId: string,
  emailRaw: string
): Promise<number> {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return 0;
  const res = await prisma.commerceOrder.updateMany({
    where: {
      customerId: null,
      status: { not: "draft" },
      metadata: {
        path: ["storefrontCheckoutEmail"],
        equals: email,
      },
    },
    data: { customerId },
  });
  return res.count;
}

/**
 * After Hosted UI/API auth for members of the Cognito **`customer`** group, ensure DB profile + merge guest-paid orders by email.
 * No-op for staff sessions (skips silently).
 */
export async function syncCommerceCustomerForCognitoCustomerUser(args: {
  sub: string;
  email?: string | null;
  groups?: readonly string[] | undefined;
}): Promise<string | null> {
  if (!isCustomer(args.groups)) return null;
  const rowId = await ensureCommerceCustomer({
    cognitoSub: args.sub,
    email: typeof args.email === "string" ? args.email : "",
  });
  if (rowId && typeof args.email === "string" && args.email.trim()) {
    await linkGuestCommerceOrdersByCheckoutEmail(rowId, args.email);
  }
  return rowId;
}
