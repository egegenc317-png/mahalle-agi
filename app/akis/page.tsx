// @ts-nocheck
import { redirect } from "next/navigation";

import { FlowFeed } from "@/components/flow-feed";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AkisPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");

  const pageSize = 15;

  const [neighborhood, posts, totalPosts] = await Promise.all([
    prisma.neighborhood.findUnique({ where: { id: session.user.neighborhoodId } }),
    prisma.flowPost.findMany({
      where: { neighborhoodId: session.user.neighborhoodId, parentPostId: null },
      include: { user: true, likes: true, replies: true, reposts: true, repostOfPost: true },
      orderBy: { createdAt: "desc" },
      take: pageSize
    }),
    prisma.flowPost.count({ where: { neighborhoodId: session.user.neighborhoodId, parentPostId: null } })
  ]);

  const neighborhoodLabel = neighborhood
    ? `${neighborhood.city} / ${neighborhood.district} / ${neighborhood.name}`
    : "Mahalle";

  return (
    <FlowFeed
      initialPosts={posts}
      totalPosts={totalPosts}
      neighborhoodLabel={neighborhoodLabel}
      neighborhoodName={neighborhood?.name || "Mahalle"}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  );
}
