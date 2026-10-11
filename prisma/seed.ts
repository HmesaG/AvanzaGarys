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

  // --- Cliente personal con el flujo completo ya avanzado --------------------
  // evaluación revisada + programa con consentimiento + pago pagado + 2/3
  // tareas completas, para poder verificar /home, /proceso, /perfil y
  // /agenda sin tener que repetir manualmente todo el flujo evaluación→
  // programa→consentimiento→pago.
  const emailLuis = "luis@avanza.local";
  const luis = await db.usuario.upsert({
    where: { email: emailLuis },
    update: {},
    create: {
      email: emailLuis,
      passwordHash: await bcrypt.hash("Avanza2026!", 10),
      nombre: "Luis Fernández",
      rol: "CLIENTE",
      cliente: {
        create: { telefono: "809-555-0101", linea: "PERSONAL", coachId: admin.id },
      },
    },
    include: { cliente: true },
  });
  const clienteLuisId = luis.cliente!.id;

  const evaluacionLuis = await db.evaluacion.findFirst({ where: { clienteId: clienteLuisId } });
  if (!evaluacionLuis) {
    await db.evaluacion.create({
      data: {
        clienteId: clienteLuisId,
        objetivoPrincipal: "Mejorar mi autoestima y manejo de estrés",
        principalDificultad: "Me cuesta mantener la constancia en mis rutinas",
        tiempoObjetivo: "3_meses",
        respuestas: { objetivoPrincipal: "Mejorar mi autoestima y manejo de estrés" },
        revisadaPorId: admin.id,
        revisadaAt: new Date(),
      },
    });
  }

  const programaLuis =
    (await db.programa.findFirst({ where: { clienteId: clienteLuisId } })) ??
    (await db.programa.create({
      data: {
        clienteId: clienteLuisId,
        nombre: "Programa — Mejorar mi autoestima y manejo de estrés",
        descripcion: "Plan de 8 sesiones de coaching personal",
        consentimientoAceptado: true,
        consentimientoAt: new Date(),
      },
    }));
  void programaLuis;

  const pagoLuis = await db.pago.findFirst({ where: { clienteId: clienteLuisId } });
  if (!pagoLuis) {
    await db.pago.create({
      data: {
        clienteId: clienteLuisId,
        monto: 5000,
        estado: "PAGADO",
        metodo: "Tarjeta",
        concepto: "Programa de coaching personal",
        fechaPago: new Date(),
      },
    });
  }

  const tareasLuis = await db.tarea.findMany({ where: { clienteId: clienteLuisId } });
  if (tareasLuis.length === 0) {
    await db.tarea.createMany({
      data: [
        { clienteId: clienteLuisId, label: "Ejercicio de autoconocimiento", completada: true },
        { clienteId: clienteLuisId, label: "Diario emocional", completada: true },
        { clienteId: clienteLuisId, label: "Técnicas de respiración", completada: false },
      ],
    });
  }

  console.log("Cliente de ejemplo (flujo completo) listo:");
  console.log(`  email:    ${emailLuis}`);
  console.log(`  password: Avanza2026! (solo desarrollo)`);

  // --- Empresa + cliente corporativo con diagnóstico completo -----------------
  const empresaEjemplo = await db.empresa.upsert({
    where: { id: "seed-empresa-techcorp" },
    update: {},
    create: { id: "seed-empresa-techcorp", nombre: "TechCorp SAS" },
  });

  const emailMaria = "maria@avanza.local";
  const maria = await db.usuario.upsert({
    where: { email: emailMaria },
    update: {},
    create: {
      email: emailMaria,
      passwordHash: await bcrypt.hash("Avanza2026!", 10),
      nombre: "María Corporativa",
      rol: "CLIENTE",
      cliente: {
        create: {
          telefono: "809-555-0202",
          linea: "CORPORATIVO",
          empresaId: empresaEjemplo.id,
        },
      },
    },
    include: { cliente: true },
  });
  const clienteMariaId = maria.cliente!.id;

  const diagnosticoMaria = await db.diagnostico.findUnique({ where: { clienteId: clienteMariaId } });
  if (!diagnosticoMaria) {
    await db.diagnostico.create({
      data: {
        clienteId: clienteMariaId,
        climaLaboral: "Bueno, pero hay silos entre departamentos",
        principalDesafio: "Retención de talento joven",
        nivelComunicacion: "REGULAR",
        objetivoEmpresa: "Mejorar cultura colaborativa en 6 meses",
      },
    });
  }

  console.log("Empresa + cliente corporativo de ejemplo listos:");
  console.log(`  empresa:  ${empresaEjemplo.nombre}`);
  console.log(`  email:    ${emailMaria}`);
  console.log(`  password: Avanza2026! (solo desarrollo)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
