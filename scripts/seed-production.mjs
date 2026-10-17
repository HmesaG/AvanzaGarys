// ========================================================
// Script de Creación Inicial de Administrador en Producción
// Uso: ADMIN_EMAIL=admin@tudominio.com ADMIN_PASSWORD=TuPassword! node --env-file=.env scripts/seed-production.mjs
// ========================================================

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ ERROR: DATABASE_URL no está definida.");
  process.exit(1);
}

const adapter = new PrismaMariaDb(dbUrl);
const db = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@avanza.com";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error("❌ ERROR: Debes proporcionar ADMIN_PASSWORD como variable de entorno.");
    console.error("   Ejemplo: ADMIN_EMAIL=admin@empresa.com ADMIN_PASSWORD=MiClaveSuperSegura node scripts/seed-production.mjs");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ ERROR: La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await db.usuario.upsert({
    where: { email },
    update: {
      passwordHash,
      rol: "ADMINISTRADOR",
    },
    create: {
      email,
      nombre: "Administrador Principal",
      passwordHash,
      rol: "ADMINISTRADOR",
    },
  });

  console.log("======================================================");
  console.log("✅ Usuario ADMINISTRADOR inicial configurado con éxito:");
  console.log(`   Email: ${admin.email}`);
  console.log(`   Rol:   ${admin.rol}`);
  console.log("======================================================");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed de producción:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
