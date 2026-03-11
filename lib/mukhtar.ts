// @ts-nocheck
import { prisma } from "@/lib/prisma";
import { getWeekEnd, getWeekKey, getWeekStart } from "@/lib/week";

type MukhtarInfo = {
  userId: string;
  name: string;
  username?: string | null;
  seconds: number;
  weekKey: string;
};

export async function getWeeklyNeighborhoodMukhtar(neighborhoodId: string, date = new Date()): Promise<MukhtarInfo | null> {
  const weekKey = getWeekKey(date);
  const [usages, users] = await Promise.all([
    prisma.userWeeklyUsage.findMany({ where: { weekKey } }),
    prisma.user.findMany()
  ]);

  const scopedUsers = (users as Array<{ id: string; neighborhoodId?: string | null; name: string; username?: string | null }>)
    .filter((u) => u.neighborhoodId === neighborhoodId);

  if (scopedUsers.length === 0) return null;

  const usageMap = new Map<string, number>();
  for (const item of usages as Array<{ userId: string; seconds: number }>) {
    usageMap.set(item.userId, (usageMap.get(item.userId) || 0) + item.seconds);
  }

  const ranked = scopedUsers
    .map((u) => ({ user: u, seconds: usageMap.get(u.id) || 0 }))
    .sort((a, b) => (b.seconds - a.seconds) || a.user.id.localeCompare(b.user.id));

  if (!ranked.length || ranked[0].seconds <= 0) return null;

  return {
    userId: ranked[0].user.id,
    name: ranked[0].user.name,
    username: ranked[0].user.username ?? null,
    seconds: ranked[0].seconds,
    weekKey
  };
}

export async function canUserCreatePollByMukhtarRule(params: {
  userId: string;
  role?: string;
  neighborhoodId: string;
  now?: Date;
}) {
  if (params.role === "ADMIN") {
    return { ok: true as const, reason: null, isMukhtar: false, mukhtar: null };
  }

  const now = params.now ?? new Date();
  const mukhtar = await getWeeklyNeighborhoodMukhtar(params.neighborhoodId, now);
  if (!mukhtar || mukhtar.userId !== params.userId) {
    return { ok: false as const, reason: "Bu hafta sadece mahalle muhtari anket acabilir.", isMukhtar: false, mukhtar };
  }

  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const polls = await prisma.poll.findMany({ where: { neighborhoodId: params.neighborhoodId } });
  const createdThisWeek = (polls as Array<{ userId: string; createdAt: Date }>)
    .filter((p) => p.userId === params.userId)
    .some((p) => {
      const t = new Date(p.createdAt).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    });

  if (createdThisWeek) {
    return { ok: false as const, reason: "Mahalle muhtari bu hafta en fazla 1 anket acabilir.", isMukhtar: true, mukhtar };
  }

  return { ok: true as const, reason: null, isMukhtar: true, mukhtar };
}

