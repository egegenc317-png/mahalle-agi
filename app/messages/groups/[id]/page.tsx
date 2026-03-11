// @ts-nocheck
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ensureGroupInvite } from "@/lib/group-invites";
import { prisma } from "@/lib/prisma";
import { GroupSettingsPanel } from "@/components/group-settings-panel";

export default async function GroupSettingsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation || conversation.conversationType !== "GROUP" || !(conversation.participantIds || []).includes(session.user.id)) {
    redirect("/messages");
  }

  const users = (await prisma.user.findMany()) as Array<{ id: string; name: string; username?: string | null; image?: string | null }>;
  const members = users.filter((user) => (conversation.participantIds || []).includes(user.id));
  const invite = await ensureGroupInvite(conversation.id, session.user.id);
  const inviteUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/conversations/groups/join?invite=${encodeURIComponent(invite.token || "")}`;

  return (
    <GroupSettingsPanel
      currentUserId={session.user.id}
      initialInviteUrl={inviteUrl}
      group={{
        id: conversation.id,
        groupName: conversation.groupName || conversation.contextTitle || "Grup Sohbeti",
        groupDescription: conversation.groupDescription || null,
        groupImage: conversation.groupImage || null,
        participantIds: conversation.participantIds || [],
        adminIds: conversation.adminIds || []
      }}
      members={members}
      allUsers={users}
    />
  );
}

