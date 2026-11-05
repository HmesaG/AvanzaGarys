// Singleton de PrismaClient con driver adapter MariaDB (Prisma 7).
// Ver ADR 007 para el razonamiento del driver adapter explícito.
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl =
  process.env.DATABASE_URL || "mysql://build:build@localhost:3306/build";
const adapter = new PrismaMariaDb(databaseUrl);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
