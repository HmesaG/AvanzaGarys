// Seed de desarrollo — Avanza (Fase 3a).
// Corre con: npm run db:seed  (equivalente a `prisma db seed`)
//
// Credenciales de desarrollo (documentadas también en el resumen de entrega):
//   admin@avanza.local  / avanza123  (rol ADMINISTRADOR)
//   coach@avanza.local  / avanza123  (rol COACH)
//   maria@avanza.local  / avanza123  (rol CLIENTE)
//   luis@avanza.local   / avanza123  (rol CLIENTE)
//   carla@avanza.local  / avanza123  (rol CLIENTE)

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, TipoAsesoria } from "../generated/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DEV_PASSWORD = "avanza123";

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  // --- Usuarios internos --------------------------------------------------
  await prisma.usuario.upsert({
    where: { correo: "admin@avanza.local" },
    update: {},
    create: {
      nombre: "Héctor Mesa",
      correo: "admin@avanza.local",
      passwordHash,
      rol: "ADMINISTRADOR",
    },
  });

  await prisma.usuario.upsert({
    where: { correo: "coach@avanza.local" },
    update: {},
    create: {
      nombre: "Carlos Reyes",
      correo: "coach@avanza.local",
      passwordHash,
      rol: "COACH",
    },
  });

  // --- Catálogo de programas (igual a PROGRAMAS_MOCK en lib/mock-data.ts) -
  const programasSeed: {
    nombre: string;
    descripcion: string;
    sesionesIncluidas: number;
    tipoAsesoria: TipoAsesoria;
    precio: number;
  }[] = [
    {
      nombre: "Impulso Personal",
      descripcion: "Acompañamiento individual enfocado en un objetivo concreto a corto plazo.",
      sesionesIncluidas: 4,
      tipoAsesoria: "PERSONAL",
      precio: 6000,
    },
    {
      nombre: "Transformación Integral",
      descripcion: "Proceso completo de coaching personal con seguimiento semanal.",
      sesionesIncluidas: 8,
      tipoAsesoria: "PERSONAL",
      precio: 11000,
    },
    {
      nombre: "Liderazgo de Equipo",
      descripcion: "Desarrollo de habilidades de liderazgo y gestión de equipos.",
      sesionesIncluidas: 6,
      tipoAsesoria: "CORPORATIVO",
      precio: 15000,
    },
    {
      nombre: "Coaching Ejecutivo",
      descripcion: "Acompañamiento estratégico para posiciones de alta responsabilidad.",
      sesionesIncluidas: 10,
      tipoAsesoria: "CORPORATIVO",
      precio: 24000,
    },
    {
      nombre: "Alto Rendimiento",
      descripcion: "Preparación mental para competencia y mejora del enfoque deportivo.",
      sesionesIncluidas: 6,
      tipoAsesoria: "DEPORTIVO",
      precio: 9000,
    },
    {
      nombre: "Constancia y Hábito",
      descripcion: "Construcción de rutinas sostenibles y manejo de la motivación.",
      sesionesIncluidas: 4,
      tipoAsesoria: "DEPORTIVO",
      precio: 5500,
    },
  ];

  for (const p of programasSeed) {
    const existente = await prisma.programa.findFirst({ where: { nombre: p.nombre } });
    if (!existente) {
      await prisma.programa.create({ data: p });
    }
  }

  // --- Clientes de ejemplo -------------------------------------------------
  const clientesSeed: {
    correo: string;
    nombreCompleto: string;
    telefono: string;
    edad: number;
    tipoAsesoria: TipoAsesoria;
  }[] = [
    {
      correo: "maria@avanza.local",
      nombreCompleto: "María Fernández",
      telefono: "809-555-1234",
      edad: 32,
      tipoAsesoria: "PERSONAL",
    },
    {
      correo: "luis@avanza.local",
      nombreCompleto: "Luis Ortega",
      telefono: "809-555-2211",
      edad: 41,
      tipoAsesoria: "CORPORATIVO",
    },
    {
      correo: "carla@avanza.local",
      nombreCompleto: "Carla Núñez",
      telefono: "809-555-7890",
      edad: 27,
      tipoAsesoria: "DEPORTIVO",
    },
  ];

  const clientesCreados = [];
  for (const c of clientesSeed) {
    const usuario = await prisma.usuario.upsert({
      where: { correo: c.correo },
      update: {},
      create: {
        nombre: c.nombreCompleto,
        correo: c.correo,
        passwordHash,
        rol: "CLIENTE",
      },
    });

    const cliente = await prisma.cliente.upsert({
      where: { usuarioId: usuario.id },
      update: {},
      create: {
        usuarioId: usuario.id,
        nombreCompleto: c.nombreCompleto,
        telefono: c.telefono,
        edad: c.edad,
        tipoAsesoria: c.tipoAsesoria,
      },
    });

    clientesCreados.push(cliente);
  }

  // --- Evaluación pendiente para el primer cliente -------------------------
  const [maria, luis] = clientesCreados;

  const evaluacionExistente = await prisma.evaluacion.findFirst({
    where: { clienteId: maria.id },
  });
  if (!evaluacionExistente) {
    await prisma.evaluacion.create({
      data: {
        clienteId: maria.id,
        objetivoPrincipal: "Mejorar mi autoestima y manejo de estrés",
        principalDificultad: "Falta de constancia en mis rutinas diarias",
        tiempoDeseado: "3_meses",
        estado: "PENDIENTE",
      },
    });
  }

  // --- Citas de ejemplo -----------------------------------------------------
  const hoy = new Date();
  const en3Dias = new Date(hoy);
  en3Dias.setDate(hoy.getDate() + 3);
  const en8Dias = new Date(hoy);
  en8Dias.setDate(hoy.getDate() + 8);

  const citasExistentes = await prisma.cita.count({ where: { clienteId: luis.id } });
  if (citasExistentes === 0) {
    await prisma.cita.createMany({
      data: [
        {
          clienteId: luis.id,
          fecha: en3Dias,
          hora: "11:00 AM",
          modalidad: "VIRTUAL",
          estado: "CONFIRMADA",
        },
        {
          clienteId: maria.id,
          fecha: en8Dias,
          hora: "02:30 PM",
          modalidad: "VIRTUAL",
          estado: "PENDIENTE",
        },
      ],
    });
  }

  console.log("Seed completado.");
  console.log(`Credenciales de desarrollo (password para todos: "${DEV_PASSWORD}"):`);
  console.log("  admin@avanza.local (ADMINISTRADOR)");
  console.log("  coach@avanza.local (COACH)");
  console.log("  maria@avanza.local / luis@avanza.local / carla@avanza.local (CLIENTE)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
