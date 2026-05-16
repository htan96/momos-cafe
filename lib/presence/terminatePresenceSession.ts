import { prisma } from "@/lib/prisma";

export async function markPresenceSessionTerminated(args: {
  sessionPublicId: string | undefined;
  cognitoSub: string | undefined;
}): Promise<void> {
  if (!args.sessionPublicId || !args.cognitoSub) return;
  await prisma.platformPresenceSession.updateMany({
    where: {
      sessionPublicId: args.sessionPublicId,
      cognitoSub: args.cognitoSub,
      terminatedAt: null,
    },
    data: {
      terminatedAt: new Date(),
      isActive: false,
    },
  });
}
