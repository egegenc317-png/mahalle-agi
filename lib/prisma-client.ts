// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import path from "path";

function resolveSqliteUrl(rawUrl: string) {
  if (!rawUrl.startsWith("file:")) return rawUrl;
  const relativePath = rawUrl.slice("file:".length);
  return path.resolve(process.cwd(), relativePath);
}

const databaseUrl = process.env.DATABASE_URL || "file:../dev.db";
const dbProvider = process.env.DB_PROVIDER || (databaseUrl.startsWith("postgres") ? "postgres" : "sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __db_prisma__: any;
}

function createPostgresClient() {
  process.env.DATABASE_URL = databaseUrl;
  // Use runtime require so Vercel production bundle does not pull sqlite adapters.
  const { PrismaClient: PostgresPrismaClient } = require("../generated/postgres-client");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PostgresPrismaClient({ adapter });
}

function createSqliteClient() {
  const { PrismaClient } = require("@prisma/client");
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({
    url: resolveSqliteUrl(databaseUrl)
  });
  return new PrismaClient({ adapter });
}

function createDbClient() {
  if (dbProvider === "postgres") {
    return createPostgresClient();
  }

  return createSqliteClient();
}

export const db = global.__db_prisma__ || createDbClient();

if (process.env.NODE_ENV !== "production") {
  global.__db_prisma__ = db;
}
