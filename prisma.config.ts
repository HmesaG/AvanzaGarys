// Configuración Prisma 7. Reemplaza el bloque "prisma" en package.json que
// se usaba en Prisma 6 y anteriores. Ver ADR 007 para el razonamiento
// (H:\GMV\ObsidianVault\01-Proyectos\Avanza\Decisiones\007-prisma7-redis-nextjs-middleware-cuid.md).
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --experimental-strip-types prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
