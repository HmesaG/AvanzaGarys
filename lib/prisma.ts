// Cliente Prisma singleton — Fase 3a (MariaDB self-hosted vía Docker).
//
// Prisma 7 requiere un driver adapter explícito para proveedores SQL (ya no
// hay motor de query embebido por defecto). Usamos @prisma/adapter-mariadb,
// compatible con MySQL y MariaDB.
//
// Patrón singleton en `globalThis` para evitar agotar el pool de conexiones
// con el hot-reload de Next.js en desarrollo.

import { PrismaClient } from "../generated/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
