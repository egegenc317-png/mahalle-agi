import path from "path";

import { PrismaClient } from "@prisma/client";
import { PrismaClient as PostgresPrismaClient } from "@/generated/postgres-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function resolveSqliteUrl(rawUrl: string) {
  if (!rawUrl.startsWith("file:")) return rawUrl;
  const relativePath = rawUrl.slice("file:".length);
  return path.resolve(process.cwd(), relativePath);
}

const databaseUrl = process.env.DATABASE_URL || "file:../dev.db";
const dbProvider = process.env.DB_PROVIDER || (databaseUrl.startsWith("postgres") ? "postgres" : "sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __db_prisma__: PrismaClient | PostgresPrismaClient | undefined;
}

function createDbClient() {
  if (dbProvider === "postgres") {
    process.env.DATABASE_URL = databaseUrl;
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    return new PostgresPrismaClient({ adapter });
  }

  const adapter = new PrismaBetterSqlite3({
    url: resolveSqliteUrl(databaseUrl)
  });
  return new PrismaClient({ adapter });
}

export const db = global.__db_prisma__ || createDbClient();

if (process.env.NODE_ENV !== "production") {
  global.__db_prisma__ = db;
}
