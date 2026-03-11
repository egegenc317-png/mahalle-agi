import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";

function getSecretMaterial() {
  const secret = process.env.APP_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || "local-dev-secret";
  return createHash("sha256").update(secret).digest();
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function matchesHash(value: string, hash: string) {
  const expected = Buffer.from(hashValue(value), "hex");
  const provided = Buffer.from(hash, "hex");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function encryptValue(value: string) {
  const key = getSecretMaterial();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptValue(payload: string) {
  const [ivHex, tagHex, encryptedHex] = payload.split(".");
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error("Geçersiz şifreli veri.");
  }

  const key = getSecretMaterial();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}
