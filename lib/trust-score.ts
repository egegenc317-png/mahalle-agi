// @ts-nocheck
import { prisma } from "@/lib/prisma";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export async function calculateTrustScore(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { listings: { where: { status: "SOLD" }, select: { id: true } } }
  });

  if (!user) return null;

  const reportsAgainstUser = await prisma.report.count({
    where: { targetType: "USER", targetId: userId, status: "OPEN" }
  });

  const completedSalesCount = user.listings.length;
  const score = clamp(50 + (user.verifiedAt ? 20 : 0) + completedSalesCount * 5 - reportsAgainstUser * 10);

  return {
    score,
    verifiedNeighborhood: Boolean(user.verifiedAt),
    completedSalesCount,
    reportsAgainstUser
  };
}

