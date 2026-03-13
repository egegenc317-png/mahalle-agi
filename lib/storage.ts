import { promises as fs } from "fs";
import path from "path";

import { HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type UploadInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
};

function getLocalUploadDir() {
  return process.env.UPLOAD_DIR || "public/uploads";
}

function getLocalPublicUrl(key: string) {
  return `/uploads/${key}`;
}

function getStorageMode() {
  return process.env.STORAGE_PROVIDER === "s3" ? "s3" : "local";
}

function getS3Config() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 storage env değişkenleri eksik.");
  }

  return {
    bucket,
    region,
    endpoint: process.env.S3_ENDPOINT || undefined,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    accessKeyId,
    secretAccessKey
  };
}

let s3Client: S3Client | null = null;

function getS3Client() {
  if (s3Client) return s3Client;
  const config = getS3Config();
  s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
  return s3Client;
}

async function uploadToLocal({ key, body }: UploadInput) {
  const uploadDir = getLocalUploadDir();
  const full = path.resolve(uploadDir);
  await fs.mkdir(full, { recursive: true });
  await fs.writeFile(path.join(full, key), Buffer.from(body));
  return { url: getLocalPublicUrl(key), provider: "local" as const };
}

async function uploadToS3({ key, body, contentType }: UploadInput) {
  const config = getS3Config();
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: Buffer.from(body),
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  const url = config.publicBaseUrl
    ? `${config.publicBaseUrl.replace(/\/$/, "")}/${key}`
    : config.endpoint
      ? `${config.endpoint.replace(/\/$/, "")}/${config.bucket}/${key}`
      : `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;

  return { url, provider: "s3" as const };
}

export async function uploadObject(input: UploadInput) {
  if (getStorageMode() === "s3") {
    return uploadToS3(input);
  }
  return uploadToLocal(input);
}

export function getStoragePublicHost() {
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  const endpoint = process.env.S3_ENDPOINT;
  const candidate = publicBaseUrl || endpoint;
  if (!candidate) return null;
  try {
    return new URL(candidate).hostname;
  } catch {
    return null;
  }
}

export async function checkStorageHealth() {
  if (getStorageMode() === "s3") {
    const config = getS3Config();
    const client = getS3Client();
    await client.send(
      new HeadBucketCommand({
        Bucket: config.bucket
      })
    );
    return { provider: "s3" as const, bucket: config.bucket };
  }

  const uploadDir = path.resolve(getLocalUploadDir());
  await fs.mkdir(uploadDir, { recursive: true });
  return { provider: "local" as const, bucket: uploadDir };
}
