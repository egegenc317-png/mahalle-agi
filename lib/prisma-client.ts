// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */

const databaseUrl = process.env.DATABASE_URL || "file:../dev.db";
const dbProvider = process.env.DB_PROVIDER || (databaseUrl.startsWith("postgres") ? "postgres" : "sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __db_prisma__: unknown;
}

function createPostgresClient() {
  process.env.DATABASE_URL = databaseUrl;
  const { PrismaClient: PostgresPrismaClient } = require("../generated/postgres-client");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PostgresPrismaClient({ adapter });
}

function createDbClient() {
  if (dbProvider !== "postgres") {
    throw new Error("Production veri katmanı Postgres olarak yapılandırılmalı.");
  }

  return createPostgresClient();
}

export const db = global.__db_prisma__ || createDbClient();

if (process.env.NODE_ENV !== "production") {
  global.__db_prisma__ = db;
}
