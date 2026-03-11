// @ts-nocheck
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GroupConversationBuilder } from "@/components/group-conversation-builder";

export default async function NewGroupConversationPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const users = (await prisma.user.findMany()) as Array<{ id: string; name: string; username?: string | null }>;

  return <GroupConversationBuilder currentUserId={session.user.id} initialUsers={users} />;
}

