import path from "path";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { uploadObject } from "@/lib/storage";

const MAX_SIZE = 12 * 1024 * 1024;
const SAFE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);
const DANGEROUS_EXTENSIONS = new Set([".html", ".htm", ".svg", ".js", ".mjs", ".cjs", ".exe", ".bat", ".cmd", ".ps1", ".msi", ".dll", ".sh", ".php", ".py", ".rb", ".jar"]);

function safeExtFromName(name: string) {
  const ext = path.extname(name || "").toLowerCase();
  if (!ext) return ".bin";
  const sanitized = ext.replace(/[^.\w-]/g, "");
  return sanitized || ".bin";
}

function looksLikeAllowedFile(bytes: Uint8Array, mimeType: string) {
  const hex = Buffer.from(bytes.slice(0, 12)).toString("hex");
  if (mimeType === "image/png") return hex.startsWith("89504e47");
  if (mimeType === "image/jpeg") return hex.startsWith("ffd8ff");
  if (mimeType === "image/webp") return Buffer.from(bytes.slice(0, 4)).toString("ascii") === "RIFF";
  if (mimeType === "application/pdf") return Buffer.from(bytes.slice(0, 4)).toString("ascii") === "%PDF";
  return true;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!(await checkRateLimit(`upload:${session.user.id}:${ip}`, { windowMs: 60_000, maxAttempts: 15 })).ok) {
    return NextResponse.json({ error: "Çok fazla dosya yükleme denemesi." }, { status: 429 });
  }

  const fd = await req.formData();
  const file = fd.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Dosya yok" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Maksimum 12MB yükleyebilirsin" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = safeExtFromName(file.name);
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "Bu dosya türüne izin verilmiyor." }, { status: 400 });
  }
  if (!SAFE_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Bu dosya türüne izin verilmiyor." }, { status: 400 });
  }
  if (!looksLikeAllowedFile(bytes, file.type)) {
    return NextResponse.json({ error: "Dosya içeriği geçersiz görünüyor." }, { status: 400 });
  }

  const name = `${Date.now()}-${randomBytes(16).toString("hex")}${ext}`;
  const uploaded = await uploadObject({
    key: name,
    body: bytes,
    contentType: file.type
  });

  const response = NextResponse.json({ url: uploaded.url });
  response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return response;
}
