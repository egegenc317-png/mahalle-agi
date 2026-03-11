/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";

import { db } from "@/lib/prisma-client";

type AuditPayload = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
};

export async function writeAuditLog(payload: AuditPayload) {
  try {
    const dbClient = db as any;
    await dbClient.auditLog.create({
      data: {
        id: randomUUID(),
        actorUserId: payload.actorUserId,
        action: payload.action,
        targetType: payload.targetType,
        targetId: payload.targetId,
        meta: payload.meta ? JSON.stringify(payload.meta) : null
      }
    });
  } catch {
    // Audit log failures should not break user actions.
  }
}
