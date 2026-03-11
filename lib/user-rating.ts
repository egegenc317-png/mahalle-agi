// @ts-nocheck
import { prisma } from "@/lib/prisma";

export const CONTENT_CREATOR_MIN_RATING = 7;
export const CONTENT_CREATOR_MIN_STARS = CONTENT_CREATOR_MIN_RATING / 2;

export async function getUserRatingAverage(userId: string) {
  const items = await prisma.userRating.findMany({ where: { targetUserId: userId } });
  if (!items.length) {
    return { average: 0, count: 0 };
  }
  const total = items.reduce((sum: number, item: { score: number }) => sum + item.score, 0);
  const average = Number((total / items.length).toFixed(1));
  return { average, count: items.length };
}

export async function canCreateContentByRating(userId: string, role?: string) {
  if (role === "ADMIN") {
    return { ok: true, average: 10, count: 0 };
  }
  const stats = await getUserRatingAverage(userId);
  return {
    ok: stats.average >= CONTENT_CREATOR_MIN_RATING,
    average: stats.average,
    count: stats.count
  };
}

