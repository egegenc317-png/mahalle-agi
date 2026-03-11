/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes } from "crypto";

import { db } from "@/lib/prisma-client";
import { decryptValue, encryptValue, hashValue, matchesHash } from "@/lib/secure-store";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 3;

function isActiveInvite(invite: { expiresAt: Date; revokedAt: Date | null }) {
  return !invite.revokedAt && invite.expiresAt.getTime() > Date.now();
}

export async function getActiveGroupInvite(conversationId: string) {
  const dbClient = db as any;
  const invite = await dbClient.groupInvite.findFirst({
    where: {
      conversationId,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return invite || null;
}

export async function createGroupInvite(conversationId: string, createdByUserId: string) {
  const dbClient = db as any;
  await dbClient.groupInvite.updateMany({
    where: {
      conversationId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  const rawToken = randomBytes(24).toString("hex");
  const invite = await dbClient.groupInvite.create({
    data: {
      id: randomBytes(8).toString("hex"),
      conversationId,
      tokenHash: hashValue(rawToken),
      tokenCipher: encryptValue(rawToken),
      createdByUserId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      revokedAt: null
    }
  });

  return { token: rawToken, expiresAt: invite.expiresAt.toISOString() };
}

export async function ensureGroupInvite(conversationId: string, createdByUserId: string) {
  const active = await getActiveGroupInvite(conversationId);
  if (active) {
    let token: string | null = null;
    try {
      token = decryptValue(active.tokenCipher);
    } catch {
      token = null;
    }

    if (token) {
      return { token, expiresAt: active.expiresAt.toISOString() };
    }
  }

  return createGroupInvite(conversationId, createdByUserId);
}

export async function revokeGroupInvite(conversationId: string) {
  const dbClient = db as any;
  await dbClient.groupInvite.updateMany({
    where: {
      conversationId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

export async function verifyGroupInvite(token: string) {
  const dbClient = db as any;
  const invites = await dbClient.groupInvite.findMany({
    where: {
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const target = invites.find((item: any) => isActiveInvite(item) && matchesHash(token, item.tokenHash));
  if (!target) return null;

  return target;
}
