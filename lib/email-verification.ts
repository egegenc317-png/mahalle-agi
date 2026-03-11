/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomInt } from "crypto";

import { db } from "@/lib/prisma-client";
import { hashValue, matchesHash } from "@/lib/secure-store";

const MAX_VERIFY_ATTEMPTS = 8;

export function generateVerificationCode() {
  return String(randomInt(100000, 999999));
}

export async function saveVerificationCode(email: string, code: string, expiresInMinutes = 4) {
  const dbClient = db as any;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await dbClient.emailVerification.upsert({
    where: { email },
    create: {
      email,
      codeHash: hashValue(code),
      expiresAt,
      verifiedAt: null,
      attempts: 0
    },
    update: {
      codeHash: hashValue(code),
      expiresAt,
      verifiedAt: null,
      attempts: 0
    }
  });

  return expiresAt.toISOString();
}

export async function verifyEmailCode(email: string, code: string) {
  const dbClient = db as any;
  const target = await dbClient.emailVerification.findUnique({ where: { email } });
  if (!target) return { ok: false, error: "Bu e-posta için doğrulama kodu bulunamadı." };

  if (target.expiresAt.getTime() < Date.now()) {
    await dbClient.emailVerification.delete({ where: { email } });
    return { ok: false, error: "Doğrulama kodunun süresi doldu." };
  }

  const normalizedCode = code.trim();
  const valid = matchesHash(normalizedCode, target.codeHash);

  if (!valid) {
    const attempts = target.attempts + 1;
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await dbClient.emailVerification.delete({ where: { email } });
    } else {
      await dbClient.emailVerification.update({
        where: { email },
        data: { attempts }
      });
    }
    return { ok: false, error: "Doğrulama kodu hatalı." };
  }

  await dbClient.emailVerification.update({
    where: { email },
    data: {
      verifiedAt: new Date()
    }
  });

  return { ok: true };
}

export async function isEmailVerified(email: string) {
  const dbClient = db as any;
  const target = await dbClient.emailVerification.findUnique({ where: { email } });
  if (!target?.verifiedAt) return false;
  return target.expiresAt.getTime() >= Date.now();
}

export async function consumeVerifiedEmail(email: string) {
  const dbClient = db as any;
  await dbClient.emailVerification.deleteMany({ where: { email } });
}
