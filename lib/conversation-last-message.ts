// @ts-nocheck
import { db } from "@/lib/prisma";

type LatestMessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: Date | string;
  senderName?: string | null;
};

export async function getLatestMessagesByConversationIds(conversationIds: string[]) {
  if (!conversationIds.length) return new Map<string, LatestMessageRow>();

  const placeholders = conversationIds.map(() => "?").join(", ");
  const sql = `
    SELECT ranked."id",
           ranked."conversationId",
           ranked."senderId",
           ranked."body",
           ranked."createdAt",
           sender."name" as "senderName"
    FROM (
      SELECT m.*,
             ROW_NUMBER() OVER (PARTITION BY m."conversationId" ORDER BY m."createdAt" DESC) AS rn
      FROM "Message" m
      WHERE m."conversationId" IN (${placeholders})
    ) ranked
    LEFT JOIN "User" sender ON sender."id" = ranked."senderId"
    WHERE ranked.rn = 1
  `;

  const rows = (await db.$queryRawUnsafe(sql, ...conversationIds)) as LatestMessageRow[];
  return new Map(
    rows.map((row) => [
      row.conversationId,
      {
        ...row,
        createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)
      }
    ])
  );
}
