import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const db = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("Avanza2026!", 10);
  
  const sec = await db.usuario.upsert({
    where: { email: "secretaria@avanza.dev" },
    update: { rol: "SECRETARIA", nombre: "Ana Secretaria" },
    create: {
      email: "secretaria@avanza.dev",
      passwordHash: hash,
      nombre: "Ana Secretaria",
      rol: "SECRETARIA",
    }
  });
  console.log("Secretaria creada/actualizada:", sec.email, sec.rol);

  const coach = await db.usuario.upsert({
    where: { email: "coach@avanza.dev" },
    update: { rol: "COACH", nombre: "Gary Coach" },
    create: {
      email: "coach@avanza.dev",
      passwordHash: hash,
      nombre: "Gary Coach",
      rol: "COACH",
    }
  });
  console.log("Coach creado/actualizada:", coach.email, coach.rol);
}

main().catch(console.error).finally(() => db.$disconnect());
