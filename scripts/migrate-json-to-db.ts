// @ts-nocheck
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { db as prisma } from "../lib/prisma-client";
const dataDir = join(process.cwd(), "data");

function readJson<T>(fileName: string, fallback: T): T {
  const filePath = join(dataDir, fileName);
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

function maybeDate(value?: string | null) {
  return value ? new Date(value) : null;
}

async function main() {
  const neighborhoods = [
    {
      id: "n1",
      city: "Bursa",
      district: "Nilufer",
      name: "Gorukle",
      inviteCode: "NILUFER123",
      lat: 40.2282,
      lng: 28.8718,
      radiusKm: 15
    },
    {
      id: "n2",
      city: "Istanbul",
      district: "Kadikoy",
      name: "Moda",
      inviteCode: "KADIKOY123",
      lat: 40.9877,
      lng: 29.0277,
      radiusKm: 15
    },
    {
      id: "n3",
      city: "Ankara",
      district: "Cankaya",
      name: "Bahcelievler",
      inviteCode: "CANKAYA123",
      lat: 39.9208,
      lng: 32.8403,
      radiusKm: 15
    }
  ];
  const defaultListings = [
    {
      id: "l1",
      neighborhoodId: "n1",
      userId: "u1",
      type: "PRODUCT",
      title: "Az kullanilmis bisiklet",
      description: "26 jant, bakimli ve temiz.",
      price: 4500,
      category: "Spor",
      photos: "[]",
      locationText: "Bursa Nilufer Gorukle",
      locationLat: 40.2294,
      locationLng: 28.8727,
      status: "ACTIVE",
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  const defaultBoardPosts = [
    {
      id: "b1",
      neighborhoodId: "n2",
      userId: "u2",
      type: "ANNOUNCEMENT",
      title: "Aksam su kesintisi",
      body: "Bugun 21:00-23:00 arasi su kesintisi olacagi duyuruldu.",
      photos: "[]",
      locationText: "Istanbul Kadikoy Moda",
      locationLat: 40.9877,
      locationLng: 29.0277,
      viewCount: 0,
      createdAt: new Date().toISOString()
    }
  ];

  const users = readJson<any[]>("users.json", []);
  const listingsFromDisk = readJson<any[]>("listings.json", []);
  const listings = listingsFromDisk.length > 0 ? listingsFromDisk : defaultListings;
  const conversations = readJson<any[]>("conversations.json", []);
  const messages = readJson<any[]>("messages.json", []);
  const boardPostsFromDisk = readJson<any[]>("board-posts.json", []);
  const boardPosts = boardPostsFromDisk.length > 0 ? boardPostsFromDisk : defaultBoardPosts;
  const polls = readJson<any[]>("polls.json", []);
  const pollVotes = readJson<any[]>("poll-votes.json", []);
  const userRatings = readJson<any[]>("user-ratings.json", []);
  const weeklyUsage = readJson<any[]>("weekly-usage.json", []);
  const emailVerifications = readJson<any[]>("email-verifications.json", []);
  const groupInvites = readJson<any[]>("group-invites.json", []);
  const rateLimits = readJson<Record<string, { count: number; windowStart: number }>>("rate-limit.json", {});
  const auditLogs = readJson<any[]>("audit-log.json", []);

  await prisma.$transaction(async (tx) => {
    await tx.pollVote.deleteMany();
    await tx.poll.deleteMany();
    await tx.message.deleteMany();
    await tx.conversation.deleteMany();
    await tx.listing.deleteMany();
    await tx.boardPost.deleteMany();
    await tx.userRating.deleteMany();
    await tx.userWeeklyUsage.deleteMany();
    await tx.report.deleteMany();
    await tx.emailVerification.deleteMany();
    await tx.groupInvite.deleteMany();
    await tx.rateLimitEntry.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.account.deleteMany();
    await tx.session.deleteMany();
    await tx.verificationToken.deleteMany();
    await tx.user.deleteMany();
    await tx.neighborhood.deleteMany();

    for (const neighborhood of neighborhoods) {
      await tx.neighborhood.create({ data: neighborhood });
    }

    for (const user of users) {
      await tx.user.create({
        data: {
          id: user.id,
          name: user.name,
          username: user.username ?? null,
          email: user.email,
          emailVerified: maybeDate(user.emailVerified),
          passwordHash: user.passwordHash,
          image: user.image ?? null,
          role: user.role || "USER",
          locationScope: user.locationScope ?? null,
          neighborhoodId: user.neighborhoodId ?? null,
          verifiedAt: maybeDate(user.verifiedAt),
          suspendedUntil: maybeDate(user.suspendedUntil),
          birthDate: maybeDate(user.birthDate),
          showAge: Boolean(user.showAge),
          accountType: user.accountType || "NEIGHBOR",
          businessCategory: user.businessCategory ?? null,
          businessClosedHours: user.businessClosedHours ? JSON.stringify(user.businessClosedHours) : null,
          shopName: user.shopName ?? null,
          shopLogo: user.shopLogo ?? null,
          shopLocationText: user.shopLocationText ?? null,
          shopLocationLat: typeof user.shopLocationLat === "number" ? user.shopLocationLat : null,
          shopLocationLng: typeof user.shopLocationLng === "number" ? user.shopLocationLng : null,
          lastBoardSeenAt: maybeDate(user.lastBoardSeenAt),
          seenBoardPostIds: Array.isArray(user.seenBoardPostIds) ? JSON.stringify(user.seenBoardPostIds) : JSON.stringify([]),
          createdAt: maybeDate(user.createdAt) || new Date()
        }
      });
    }

    for (const listing of listings) {
      await tx.listing.create({
        data: {
          id: listing.id,
          neighborhoodId: listing.neighborhoodId,
          userId: listing.userId,
          type: listing.type,
          title: listing.title,
          description: listing.description,
          price: typeof listing.price === "number" ? listing.price : null,
          category: listing.category,
          photos: typeof listing.photos === "string" ? listing.photos : JSON.stringify(listing.photos || []),
          locationHint: listing.locationHint ?? null,
          locationText: listing.locationText ?? null,
          locationLat: typeof listing.locationLat === "number" ? listing.locationLat : null,
          locationLng: typeof listing.locationLng === "number" ? listing.locationLng : null,
          status: listing.status || "ACTIVE",
          adminNote: listing.adminNote ?? null,
          viewCount: typeof listing.viewCount === "number" ? listing.viewCount : 0,
          createdAt: maybeDate(listing.createdAt) || new Date(),
          updatedAt: maybeDate(listing.updatedAt) || new Date()
        }
      });
    }

    for (const conversation of conversations) {
      await tx.conversation.create({
        data: {
          id: conversation.id,
          listingId: conversation.listingId ?? null,
          buyerId: conversation.buyerId,
          sellerId: conversation.sellerId,
          conversationType: conversation.conversationType || "DIRECT",
          contextType: conversation.contextType ?? null,
          contextTitle: conversation.contextTitle ?? null,
          groupName: conversation.groupName ?? null,
          groupDescription: conversation.groupDescription ?? null,
          groupImage: conversation.groupImage ?? null,
          participantIds: Array.isArray(conversation.participantIds) ? JSON.stringify(conversation.participantIds) : null,
          adminIds: Array.isArray(conversation.adminIds) ? JSON.stringify(conversation.adminIds) : null,
          createdById: conversation.createdById ?? null,
          lastSeenByUser: conversation.lastSeenByUser ? JSON.stringify(conversation.lastSeenByUser) : null,
          pinnedMessageId: conversation.pinnedMessageId ?? null,
          pinnedMessageAt: maybeDate(conversation.pinnedMessageAt),
          pinnedByUserId: conversation.pinnedByUserId ?? null,
          lastSeenByBuyerAt: maybeDate(conversation.lastSeenByBuyerAt),
          lastSeenBySellerAt: maybeDate(conversation.lastSeenBySellerAt),
          createdAt: maybeDate(conversation.createdAt) || new Date()
        }
      });
    }

    for (const message of messages) {
      await tx.message.create({
        data: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          body: message.body,
          viewOnceConsumedByBuyerAt: maybeDate(message.viewOnceConsumedByBuyerAt),
          viewOnceConsumedBySellerAt: maybeDate(message.viewOnceConsumedBySellerAt),
          createdAt: maybeDate(message.createdAt) || new Date()
        }
      });
    }

    for (const post of boardPosts) {
      await tx.boardPost.create({
        data: {
          id: post.id,
          neighborhoodId: post.neighborhoodId,
          userId: post.userId,
          type: post.type,
          title: post.title,
          body: post.body,
          photos: typeof post.photos === "string" ? post.photos : JSON.stringify(post.photos || []),
          locationText: post.locationText ?? null,
          locationLat: typeof post.locationLat === "number" ? post.locationLat : null,
          locationLng: typeof post.locationLng === "number" ? post.locationLng : null,
          viewCount: typeof post.viewCount === "number" ? post.viewCount : 0,
          createdAt: maybeDate(post.createdAt) || new Date()
        }
      });
    }

    for (const poll of polls) {
      await tx.poll.create({
        data: {
          id: poll.id,
          neighborhoodId: poll.neighborhoodId,
          userId: poll.userId,
          question: poll.question,
          options: JSON.stringify(poll.options || []),
          createdAt: maybeDate(poll.createdAt) || new Date()
        }
      });
    }

    for (const vote of pollVotes) {
      await tx.pollVote.create({
        data: {
          id: vote.id,
          pollId: vote.pollId,
          userId: vote.userId,
          userIdIndex: vote.userId,
          optionIndex: Number(vote.optionIndex || 0),
          createdAt: maybeDate(vote.createdAt) || new Date()
        }
      });
    }

    for (const rating of userRatings) {
      await tx.userRating.create({
        data: {
          id: rating.id,
          raterUserId: rating.raterUserId,
          targetUserId: rating.targetUserId,
          score: Number(rating.score || 0),
          createdAt: maybeDate(rating.createdAt) || new Date(),
          updatedAt: maybeDate(rating.updatedAt) || new Date()
        }
      });
    }

    for (const usage of weeklyUsage) {
      await tx.userWeeklyUsage.create({
        data: {
          id: usage.id,
          userId: usage.userId,
          weekKey: usage.weekKey,
          seconds: Number(usage.seconds || 0),
          createdAt: maybeDate(usage.createdAt) || new Date(),
          updatedAt: maybeDate(usage.updatedAt) || new Date()
        }
      });
    }

    for (const item of emailVerifications) {
      if (!item?.email || !item?.codeHash) continue;
      await tx.emailVerification.create({
        data: {
          email: item.email,
          codeHash: item.codeHash,
          expiresAt: maybeDate(item.expiresAt) || new Date(),
          verifiedAt: maybeDate(item.verifiedAt),
          attempts: Number(item.attempts || 0)
        }
      });
    }

    for (const invite of groupInvites) {
      if (!invite?.id || !invite?.conversationId || !invite?.tokenHash || !invite?.tokenCipher) continue;
      await tx.groupInvite.create({
        data: {
          id: invite.id,
          conversationId: invite.conversationId,
          tokenHash: invite.tokenHash,
          tokenCipher: invite.tokenCipher,
          createdByUserId: invite.createdByUserId,
          createdAt: maybeDate(invite.createdAt) || new Date(),
          expiresAt: maybeDate(invite.expiresAt) || new Date(),
          revokedAt: maybeDate(invite.revokedAt)
        }
      });
    }

    for (const [key, value] of Object.entries(rateLimits)) {
      await tx.rateLimitEntry.create({
        data: {
          key,
          count: Number(value.count || 0),
          windowStart: BigInt(value.windowStart || 0)
        }
      });
    }

    for (const log of auditLogs) {
      await tx.auditLog.create({
        data: {
          id: log.id,
          actorUserId: log.actorUserId ?? null,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId ?? null,
          meta: log.meta ? JSON.stringify(log.meta) : null,
          createdAt: maybeDate(log.createdAt) || new Date()
        }
      });
    }
  });

  console.log("JSON verileri veritabanına taşındı.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
