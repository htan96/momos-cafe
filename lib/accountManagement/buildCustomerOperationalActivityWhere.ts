import type { Prisma } from "@prisma/client";

/** Match `OperationalActivityEvent` rows that plausibly reference a diner profile (coverage depends on emitters). */
export function buildCustomerOperationalActivityWhere(customer: {
  id: string;
  email: string | null;
  externalAuthSubject: string | null;
}): Prisma.OperationalActivityEventWhereInput {
  const or: Prisma.OperationalActivityEventWhereInput[] = [
    { metadata: { path: ["entities", "customerId"], equals: customer.id } },
    { metadata: { path: ["customerId"], equals: customer.id } },
    { actorId: customer.id },
  ];
  if (customer.externalAuthSubject?.trim()) {
    or.push({ actorId: customer.externalAuthSubject.trim() });
  }
  const mail = customer.email?.trim();
  if (mail) {
    const lower = mail.toLowerCase();
    or.push({ metadata: { path: ["targetEmail"], equals: lower } });
    if (lower !== mail) {
      or.push({ metadata: { path: ["targetEmail"], equals: mail } });
    }
  }
  return { OR: or };
}
