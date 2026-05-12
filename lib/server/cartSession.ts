import type { UnifiedCartLine } from "@/types/commerce";
import { prisma } from "@/lib/prisma";
import { unifiedLineToCartItemCreate } from "@/lib/commerce/cartLineDb";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function upsertGuestCartSession(guestToken: string, lines: UnifiedCartLine[]) {
  const creates = lines.map(unifiedLineToCartItemCreate);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  return prisma.cartSession.upsert({
    where: { guestToken },
    create: {
      guestToken,
      expiresAt,
      items: { create: creates },
    },
    update: {
      expiresAt,
      items: {
        deleteMany: {},
        create: creates,
      },
    },
    include: { items: true },
  });
}

export async function getGuestCartSession(guestToken: string) {
  return prisma.cartSession.findUnique({
    where: { guestToken },
    include: { items: true },
  });
}
