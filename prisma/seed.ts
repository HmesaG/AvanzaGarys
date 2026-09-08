// Seed mínimo de desarrollo: un usuario ADMINISTRADOR para que dev-senior
// pueda probar el login real una vez implementado auth.
// Ejecutar con: npx prisma db seed  (usa el comando configurado en prisma.config.ts)
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const db = new PrismaClient({ adapter });

async function main() {
  const email = "admin@avanza.dev";
  const passwordPlano = "Avanza2026!"; // Solo desarrollo. Cambiar en cualquier ambiente real.
  const passwordHash = await bcrypt.hash(passwordPlano, 10);

  const admin = await db.usuario.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      nombre: "Administrador Desarrollo",
      rol: "ADMINISTRADOR",
    },
  });

  console.log("Usuario ADMINISTRADOR de desarrollo listo:");
  console.log(`  email:    ${admin.email}`);
  console.log(`  password: ${passwordPlano} (solo desarrollo, no usar en prod)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
