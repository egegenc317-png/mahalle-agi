// @ts-nocheck
import "dotenv/config";
import path from "path";

import { PrismaClient as SqlitePrismaClient } from "@prisma/client";
import { PrismaClient as PostgresPrismaClient } from "../generated/postgres-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function resolveSqliteUrl(rawUrl: string) {
  if (!rawUrl.startsWith("file:")) return rawUrl;
  return path.resolve(process.cwd(), rawUrl.slice("file:".length));
}

const sqliteUrl = process.env.SQLITE_DATABASE_URL || process.env.DATABASE_URL || "file:../dev.db";
const postgresUrl = process.env.POSTGRES_DATABASE_URL;

if (!postgresUrl) {
  throw new Error("POSTGRES_DATABASE_URL tanımlı olmalı.");
}

const source = new SqlitePrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: resolveSqliteUrl(sqliteUrl)
  })
});

process.env.DATABASE_URL = postgresUrl;
const target = new PostgresPrismaClient({
  adapter: new PrismaPg({ connectionString: postgresUrl })
});

async function main() {
  const [
    neighborhoods,
    users,
    listings,
    conversations,
    messages,
    reports,
    boardPosts,
    polls,
    pollVotes,
    userRatings,
    weeklyUsage,
    groupInvites,
    emailVerifications,
    rateLimitEntries,
    auditLogs,
    accounts,
    sessions,
    verificationTokens
  ] = await Promise.all([
    source.neighborhood.findMany(),
    source.user.findMany(),
    source.listing.findMany(),
    source.conversation.findMany(),
    source.message.findMany(),
    source.report.findMany(),
    source.boardPost.findMany(),
    source.poll.findMany(),
    source.pollVote.findMany(),
    source.userRating.findMany(),
    source.userWeeklyUsage.findMany(),
    source.groupInvite.findMany(),
    source.emailVerification.findMany(),
    source.rateLimitEntry.findMany(),
    source.auditLog.findMany(),
    source.account.findMany(),
    source.session.findMany(),
    source.verificationToken.findMany()
  ]);

  await target.$transaction(async (tx) => {
    await tx.session.deleteMany();
    await tx.account.deleteMany();
    await tx.verificationToken.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.rateLimitEntry.deleteMany();
    await tx.emailVerification.deleteMany();
    await tx.groupInvite.deleteMany();
    await tx.userWeeklyUsage.deleteMany();
    await tx.userRating.deleteMany();
    await tx.pollVote.deleteMany();
    await tx.poll.deleteMany();
    await tx.boardPost.deleteMany();
    await tx.report.deleteMany();
    await tx.message.deleteMany();
    await tx.conversation.deleteMany();
    await tx.listing.deleteMany();
    await tx.user.deleteMany();
    await tx.neighborhood.deleteMany();

    if (neighborhoods.length) await tx.neighborhood.createMany({ data: neighborhoods });
    if (users.length) await tx.user.createMany({ data: users });
    if (listings.length) await tx.listing.createMany({ data: listings });
    if (conversations.length) await tx.conversation.createMany({ data: conversations });
    if (messages.length) await tx.message.createMany({ data: messages });
    if (reports.length) await tx.report.createMany({ data: reports });
    if (boardPosts.length) await tx.boardPost.createMany({ data: boardPosts });
    if (polls.length) await tx.poll.createMany({ data: polls });
    if (pollVotes.length) await tx.pollVote.createMany({ data: pollVotes });
    if (userRatings.length) await tx.userRating.createMany({ data: userRatings });
    if (weeklyUsage.length) await tx.userWeeklyUsage.createMany({ data: weeklyUsage });
    if (groupInvites.length) await tx.groupInvite.createMany({ data: groupInvites });
    if (emailVerifications.length) await tx.emailVerification.createMany({ data: emailVerifications });
    if (rateLimitEntries.length) await tx.rateLimitEntry.createMany({ data: rateLimitEntries });
    if (auditLogs.length) await tx.auditLog.createMany({ data: auditLogs });
    if (accounts.length) await tx.account.createMany({ data: accounts });
    if (sessions.length) await tx.session.createMany({ data: sessions });
    if (verificationTokens.length) await tx.verificationToken.createMany({ data: verificationTokens });
  });

  console.log("SQLite verileri Postgres veritabanına taşındı.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
