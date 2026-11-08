import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/index.js";

function crearAdapter(databaseUrl) {
  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  });
}

const db = new PrismaClient({ adapter: crearAdapter(process.env.DATABASE_URL) });

async function main() {
  console.log("Sembrando ecosistema completo de usuarios y datos de prueba en AvanzA...");
  const passwordHash = await bcrypt.hash("Avanza2026!", 10);

  const ahora = new Date();
  const hace5Dias = new Date(ahora.getTime() - 5 * 24 * 3600 * 1000);
  const hace2Dias = new Date(ahora.getTime() - 2 * 24 * 3600 * 1000);
  const ayer = new Date(ahora.getTime() - 1 * 24 * 3600 * 1000);
  const hoyEn2Horas = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
    Math.min(20, ahora.getHours() + 2),
    0,
    0,
  );
  const hoyEn4Horas = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
    Math.min(21, ahora.getHours() + 3),
    30,
    0,
  );
  const manana = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate() + 1,
    15,
    0,
    0,
  );

  // 1. USUARIOS DE STAFF (ADMINISTRADOR, COACH 1, COACH 2, SECRETARIA)
  const adminTest = await db.usuario.upsert({
    where: { email: "dueno@avanza.test" },
    update: {
      nombre: "Garys Paniagua (Dueño Test)",
      rol: "ADMINISTRADOR",
      passwordHash,
      activo: true,
    },
    create: {
      email: "dueno@avanza.test",
      nombre: "Garys Paniagua (Dueño Test)",
      rol: "ADMINISTRADOR",
      passwordHash,
      activo: true,
    },
  });

  const coach1 = await db.usuario.upsert({
    where: { email: "coach1@avanza.test" },
    update: {
      nombre: "Dra. Laura Méndez (Coach)",
      rol: "COACH",
      passwordHash,
      activo: true,
      esquemaHonorario: "PORCENTAJE",
      valorHonorario: 30,
      disponibilidadJson: {
        dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
        horaInicio: "09:00",
        horaFin: "18:00",
        modalidadPreferida: "Ambas",
        notaHorario: "Disponible para sesiones ejecutivas y corporativas.",
        actualizadoEn: ahora.toISOString(),
      },
    },
    create: {
      email: "coach1@avanza.test",
      nombre: "Dra. Laura Méndez (Coach)",
      rol: "COACH",
      passwordHash,
      activo: true,
      esquemaHonorario: "PORCENTAJE",
      valorHonorario: 30,
      disponibilidadJson: {
        dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
        horaInicio: "09:00",
        horaFin: "18:00",
        modalidadPreferida: "Ambas",
        notaHorario: "Disponible para sesiones ejecutivas y corporativas.",
        actualizadoEn: ahora.toISOString(),
      },
    },
  });

  const coach2 = await db.usuario.upsert({
    where: { email: "coach2@avanza.test" },
    update: {
      nombre: "Lic. Roberto Silva (Coach Deportivo)",
      rol: "COACH",
      passwordHash,
      activo: true,
      esquemaHonorario: "FIJO_POR_SESION",
      valorHonorario: 1500,
      disponibilidadJson: {
        dias: ["Martes", "Jueves", "Sábado"],
        horaInicio: "10:00",
        horaFin: "19:00",
        modalidadPreferida: "Virtual",
        notaHorario: "Especialista en psicología deportiva y alto rendimiento.",
        actualizadoEn: ahora.toISOString(),
      },
    },
    create: {
      email: "coach2@avanza.test",
      nombre: "Lic. Roberto Silva (Coach Deportivo)",
      rol: "COACH",
      passwordHash,
      activo: true,
      esquemaHonorario: "FIJO_POR_SESION",
      valorHonorario: 1500,
      disponibilidadJson: {
        dias: ["Martes", "Jueves", "Sábado"],
        horaInicio: "10:00",
        horaFin: "19:00",
        modalidadPreferida: "Virtual",
        notaHorario: "Especialista en psicología deportiva y alto rendimiento.",
        actualizadoEn: ahora.toISOString(),
      },
    },
  });

  const secretaria = await db.usuario.upsert({
    where: { email: "secretaria@avanza.test" },
    update: {
      nombre: "Ana Gómez (Secretaria)",
      rol: "SECRETARIA",
      passwordHash,
      activo: true,
    },
    create: {
      email: "secretaria@avanza.test",
      nombre: "Ana Gómez (Secretaria)",
      rol: "SECRETARIA",
      passwordHash,
      activo: true,
    },
  });

  // 2. EMPRESA B2B DE PRUEBA
  const empresaExistente = await db.empresa.findFirst({
    where: { nombre: "Grupo Empresarial Caribe SAS" },
  });
  const empresaCaribe = empresaExistente
    ? await db.empresa.update({
        where: { id: empresaExistente.id },
        data: { ruc: "1-31-98452-2", telefono: "809-555-0200" },
      })
    : await db.empresa.create({
        data: {
          nombre: "Grupo Empresarial Caribe SAS",
          ruc: "1-31-98452-2",
          telefono: "809-555-0200",
        },
      });

  // Helper para crear/actualizar usuario + cliente limpio
  async function asegurarCliente({ email, nombre, linea, telefono, coachId, empresaId }) {
    const u = await db.usuario.upsert({
      where: { email },
      update: { nombre, rol: "CLIENTE", passwordHash, activo: true },
      create: { email, nombre, rol: "CLIENTE", passwordHash, activo: true },
    });

    const c = await db.cliente.upsert({
      where: { usuarioId: u.id },
      update: {
        linea,
        telefono,
        coachId: coachId ?? null,
        empresaId: empresaId ?? null,
      },
      create: {
        usuarioId: u.id,
        linea,
        telefono,
        coachId: coachId ?? null,
        empresaId: empresaId ?? null,
      },
    });

    // Limpiar registros previos del cliente de prueba para re-sembrar de forma idempotente
    await db.compromisoGrow.deleteMany({ where: { sesion: { plan: { clienteId: c.id } } } });
    await db.sesionGrow.deleteMany({ where: { plan: { clienteId: c.id } } });
    await db.planGrow.deleteMany({ where: { clienteId: c.id } });
    await db.mensaje.deleteMany({ where: { clienteId: c.id } });
    await db.cita.deleteMany({ where: { clienteId: c.id } });
    await db.pago.deleteMany({ where: { clienteId: c.id } });
    await db.tarea.deleteMany({ where: { clienteId: c.id } });
    await db.programa.deleteMany({ where: { clienteId: c.id } });
    await db.evaluacion.deleteMany({ where: { clienteId: c.id } });
    await db.diagnostico.deleteMany({ where: { clienteId: c.id } });
    await db.diagnosticoDeportivo.deleteMany({ where: { clienteId: c.id } });

    return { usuario: u, cliente: c };
  }

  // =========================================================================
  // CLIENTE 1: PERSONAL ACTIVO COMPLETO (personal@avanza.test)
  // =========================================================================
  const { usuario: uPersonal, cliente: cPersonal } = await asegurarCliente({
    email: "personal@avanza.test",
    nombre: "Luis Fernández (Coachee Personal)",
    linea: "PERSONAL",
    telefono: "809-555-0101",
    coachId: coach1.id,
  });

  await db.evaluacion.create({
    data: {
      clienteId: cPersonal.id,
      objetivoPrincipal: "Desarrollar liderazgo estratégico y equilibrio vida-trabajo al asumir la dirección regional.",
      principalDificultad: "Sobrecarga operativa, dificultad para delegar en mandos medios y estrés sostenido.",
      tiempoObjetivo: "3 meses",
      respuestas: {
        objetivoPrincipal: "Desarrollar liderazgo estratégico y equilibrio vida-trabajo.",
        principalDificultad: "Sobrecarga operativa y delegación.",
        tiempoObjetivo: "3 meses",
      },
      revisadaPorId: coach1.id,
      revisadaAt: hace5Dias,
      createdAt: hace5Dias,
    },
  });

  await db.programa.create({
    data: {
      clienteId: cPersonal.id,
      nombre: "Liderazgo Personal & Claridad Ejecutiva",
      descripcion: "Programa intensivo de 8 sesiones bajo metodología GROW para toma de decisiones y delegación efectiva.",
      progreso: 67,
      activo: true,
      consentimientoAceptado: true,
      consentimientoAt: hace5Dias,
    },
  });

  await db.pago.create({
    data: {
      clienteId: cPersonal.id,
      monto: 8500,
      estado: "PAGADO",
      metodo: "Transferencia",
      concepto: "Programa: Liderazgo Personal & Claridad Ejecutiva",
      fechaPago: hace5Dias,
      comprobanteUrl: "/logos/logo-01-monograma-ascenso.svg",
    },
  });

  await db.tarea.createMany({
    data: [
      { clienteId: cPersonal.id, label: "Ejercicio de autoconocimiento y mapa de prioridades", completada: true },
      { clienteId: cPersonal.id, label: "Diario de delegación consciente (7 días)", completada: true },
      { clienteId: cPersonal.id, label: "Técnicas de respiración y cierre de jornada sin pantallas", completada: false },
    ],
  });

  const planPersonal = await db.planGrow.create({
    data: {
      clienteId: cPersonal.id,
      tipo: "PERSONAL",
      semanaActual: 2,
      totalSemanas: 4,
      estado: "ACTIVO",
    },
  });

  const sesion1 = await db.sesionGrow.create({
    data: {
      planId: planPersonal.id,
      semana: 1,
      etapa: "GOAL",
      completadaAt: hace5Dias,
      notaCoach: "Excelente claridad en su meta trimestral. Acordamos transferir 3 reportes operativos a su equipo esta semana.",
      respuestas: {
        items: [
          {
            pregunta: "¿Qué querés lograr en estas 4 semanas?",
            respuesta: "Delegar el 40% de las tareas operativas diarias y recuperar 6 horas semanales de enfoque estratégico.",
          },
          {
            pregunta: "¿Cómo vas a saber que lo alcanzaste?",
            respuesta: "Porque mi calendario tendrá dos bloques libres de reuniones operativas martes y jueves.",
          },
        ],
        feedbackIa: {
          reflexion: "Meta específica, medible y alineada con el rol directivo. Se recomienda establecer indicadores semanales de seguimiento con cada líder de área.",
        },
      },
    },
  });

  await db.compromisoGrow.createMany({
    data: [
      {
        sesionId: sesion1.id,
        accion: "Reunión 1-a-1 con coordinadores para delegar el reporte diario de operaciones",
        fechaPrevista: hace2Dias,
        estado: "CUMPLIDO",
        resultado: "Se transfirió el reporte con plantilla estandarizada sin fricciones.",
      },
      {
        sesionId: sesion1.id,
        accion: "Bloquear 2 horas de enfoque estratégico martes y jueves sin revisar WhatsApp",
        fechaPrevista: ayer,
        estado: "PENDIENTE",
      },
    ],
  });

  await db.sesionGrow.createMany({
    data: [
      { planId: planPersonal.id, semana: 2, etapa: "REALITY" },
      { planId: planPersonal.id, semana: 3, etapa: "OPTIONS" },
      { planId: planPersonal.id, semana: 4, etapa: "WILL" },
    ],
  });

  // Citas del Cliente 1 (una completada con bitácora ICF y una hoy confirmada)
  await db.cita.createMany({
    data: [
      {
        clienteId: cPersonal.id,
        coachId: coach1.id,
        fecha: hace5Dias,
        modalidad: "Virtual",
        estado: "COMPLETADA",
        enlaceReunion: "https://meet.jit.si/Avanza-Coaching-Demo-Personal-1",
        notas: "Sesión 1 (Etapa GOAL): Exploramos las creencias limitantes alrededor del control operativo. El coachee diseñó su matriz de delegación y asumió dos compromisos concretos para la semana.",
      },
      {
        clienteId: cPersonal.id,
        coachId: coach1.id,
        fecha: hoyEn2Horas,
        modalidad: "Virtual",
        estado: "CONFIRMADA",
        enlaceReunion: "https://meet.jit.si/Avanza-Coaching-Demo-Personal-2",
        notas: "Sesión 2 (Etapa REALITY): Revisión de avances en delegación y barreras actuales.",
      },
    ],
  });

  await db.mensaje.createMany({
    data: [
      {
        clienteId: cPersonal.id,
        deId: coach1.id,
        texto: "¡Hola Luis! Bienvenido a tu espacio en AvanzA. Ya dejé habilitada tu primera sesión GROW y tus ejercicios iniciales.",
      },
      {
        clienteId: cPersonal.id,
        deId: uPersonal.id,
        texto: "¡Muchas gracias Dra. Laura! Ya completé los primeros dos ejercicios y hoy pude delegar el cierre operativo con éxito.",
      },
      {
        clienteId: cPersonal.id,
        deId: coach1.id,
        texto: "¡Excelente avance! Nos vemos hoy en nuestra sesión virtual para trabajar la etapa Reality.",
      },
    ],
  });

  // =========================================================================
  // CLIENTE 2: EVALUACIÓN PENDIENTE DE AUTORIZAR (solicitud@avanza.test)
  // =========================================================================
  const { cliente: cSolicitud } = await asegurarCliente({
    email: "solicitud@avanza.test",
    nombre: "Camila Reyes (Solicitud Pendiente)",
    linea: "PERSONAL",
    telefono: "809-555-0102",
    coachId: null, // Sin asignar para probar bandeja de asignación + aprobación
  });

  await db.evaluacion.create({
    data: {
      clienteId: cSolicitud.id,
      objetivoPrincipal: "Transición de carrera hacia gerencia de proyectos tecnológicos y manejo del síndrome del impostor.",
      principalDificultad: "Inseguridad al presentar ante juntas directivas y postergación de decisiones clave.",
      tiempoObjetivo: "6 meses",
      respuestas: {
        objetivoPrincipal: "Transición de carrera hacia gerencia de proyectos tecnológicos.",
        principalDificultad: "Inseguridad al presentar ante juntas directivas.",
        tiempoObjetivo: "6 meses",
      },
      createdAt: hace2Dias, // > 24h para activar alerta urgente en el Dashboard
    },
  });

  // =========================================================================
  // CLIENTE 3: VOUCHER EN REVISIÓN PENDIENTE DE VALIDAR (voucher@avanza.test)
  // =========================================================================
  const { cliente: cVoucher } = await asegurarCliente({
    email: "voucher@avanza.test",
    nombre: "Diego Santos (Voucher en Revisión)",
    linea: "PERSONAL",
    telefono: "809-555-0103",
    coachId: coach1.id,
  });

  await db.evaluacion.create({
    data: {
      clienteId: cVoucher.id,
      objetivoPrincipal: "Mejorar mi comunicación asertiva y gestión emocional en negociaciones comerciales.",
      principalDificultad: "Reacciones impulsivas bajo presión de cierre de mes.",
      tiempoObjetivo: "3 meses",
      revisadaPorId: coach1.id,
      revisadaAt: ayer,
      createdAt: hace2Dias,
    },
  });

  await db.programa.create({
    data: {
      clienteId: cVoucher.id,
      nombre: "Comunicación Asertiva & Inteligencia Emocional",
      descripcion: "Acompañamiento práctico de 6 sesiones enfocado en negociación y regulación emocional.",
      progreso: 15,
      activo: true,
      consentimientoAceptado: true,
      consentimientoAt: ayer,
    },
  });

  await db.pago.create({
    data: {
      clienteId: cVoucher.id,
      monto: 6500,
      estado: "PENDIENTE",
      metodo: "Transferencia",
      concepto: "Programa: Comunicación Asertiva & Inteligencia Emocional",
      comprobanteUrl: "/logos/logo-02-brujula-grow.svg",
    },
  });

  await db.tarea.createMany({
    data: [
      { clienteId: cVoucher.id, label: "Registro de disparadores emocionales en reuniones", completada: false },
      { clienteId: cVoucher.id, label: "Práctica de escucha activa sin interrupción", completada: false },
    ],
  });

  // =========================================================================
  // CLIENTE 4: CORPORATIVO B2B CON DIAGNÓSTICO (corporativo@avanza.test)
  // =========================================================================
  const { cliente: cCorp } = await asegurarCliente({
    email: "corporativo@avanza.test",
    nombre: "María Rodríguez (Ejecutiva B2B)",
    linea: "CORPORATIVO",
    telefono: "809-555-0104",
    coachId: coach1.id,
    empresaId: empresaCaribe.id,
  });

  await db.diagnostico.create({
    data: {
      clienteId: cCorp.id,
      climaLaboral: "Equipo comprometido pero con alta presión por metas trimestrales y silos entre ventas y operaciones.",
      principalDesafio: "Alinear la comunicación interdepartamental y reducir la rotación de supervisores.",
      nivelComunicacion: "REGULAR",
      objetivoEmpresa: "Consolidar una cultura de feedback continuo y elevar el cumplimiento de OKRs al 90%.",
    },
  });

  await db.evaluacion.create({
    data: {
      clienteId: cCorp.id,
      objetivoPrincipal: "Fortalecer el liderazgo colaborativo entre las gerencias de operaciones y comercial.",
      principalDificultad: "Reuniones extensas sin acuerdos accionables ni seguimiento claro.",
      tiempoObjetivo: "3 meses",
      revisadaPorId: coach1.id,
      revisadaAt: hace5Dias,
      createdAt: hace5Dias,
    },
  });

  await db.programa.create({
    data: {
      clienteId: cCorp.id,
      nombre: "Coaching Ejecutivo & Alineación de Equipos B2B",
      descripcion: "Programa corporativo para líderes de Grupo Empresarial Caribe SAS.",
      progreso: 50,
      activo: true,
      consentimientoAceptado: true,
      consentimientoAt: hace5Dias,
    },
  });

  await db.pago.create({
    data: {
      clienteId: cCorp.id,
      monto: 18500,
      estado: "PAGADO",
      metodo: "Transferencia",
      concepto: "Programa Corporativo B2B — Grupo Empresarial Caribe SAS",
      fechaPago: hace5Dias,
    },
  });

  await db.cita.create({
    data: {
      clienteId: cCorp.id,
      coachId: coach1.id,
      fecha: hoyEn4Horas,
      modalidad: "Presencial",
      estado: "PENDIENTE",
      notas: "Sesión presencial de seguimiento de indicadores B2B en Sala AvanzA.",
    },
  });

  // =========================================================================
  // CLIENTE 5: DEPORTIVO ALTO RENDIMIENTO (deportivo@avanza.test)
  // =========================================================================
  const { cliente: cDep } = await asegurarCliente({
    email: "deportivo@avanza.test",
    nombre: "Carlos Mateo (Atleta Alto Rendimiento)",
    linea: "DEPORTIVO",
    telefono: "809-555-0105",
    coachId: coach2.id,
  });

  await db.diagnosticoDeportivo.create({
    data: {
      clienteId: cDep.id,
      disciplina: "Tenis de Campo",
      categoria: "Selección Nacional / Profesional",
      metaCompetitiva: "Clasificar a semifinales del circuito caribeño y sostener el saque en tie-breaks decisivos.",
      bloqueoMental: "Pérdida de concentración tras errores no forzados en el segundo set.",
      nivelDescansoNutricion: "Óptimo (8h de sueño y plan nutricional supervisado)",
      horasEntrenamientoSemana: 24,
    },
  });

  await db.evaluacion.create({
    data: {
      clienteId: cDep.id,
      objetivoPrincipal: "Mantener fortaleza mental y ritual de reseteo emocional entre puntos críticos.",
      principalDificultad: "Frustración visible cuando el marcador se pone en contra.",
      tiempoObjetivo: "3 meses",
      revisadaPorId: coach2.id,
      revisadaAt: hace5Dias,
      createdAt: hace5Dias,
    },
  });

  await db.programa.create({
    data: {
      clienteId: cDep.id,
      nombre: "Mentalidad Competitiva & Enfoque Bajo Presión",
      descripcion: "Entrenamiento mental para atletas de alto rendimiento antes y durante competencia.",
      progreso: 75,
      activo: true,
      consentimientoAceptado: true,
      consentimientoAt: hace5Dias,
    },
  });

  await db.pago.create({
    data: {
      clienteId: cDep.id,
      monto: 9500,
      estado: "PAGADO",
      metodo: "Tarjeta",
      concepto: "Programa: Mentalidad Competitiva & Enfoque Bajo Presión",
      fechaPago: hace5Dias,
    },
  });

  await db.tarea.createMany({
    data: [
      { clienteId: cDep.id, label: "Rutina de respiración 4-7-8 en cambios de lado", completada: true },
      { clienteId: cDep.id, label: "Visualización pre-partido (15 minutos)", completada: true },
      { clienteId: cDep.id, label: "Anclaje físico de reseteo tras punto perdido", completada: false },
    ],
  });

  await db.cita.createMany({
    data: [
      {
        clienteId: cDep.id,
        coachId: coach2.id,
        fecha: hace2Dias,
        modalidad: "Virtual",
        estado: "COMPLETADA",
        enlaceReunion: "https://meet.jit.si/Avanza-Coaching-Deportivo-1",
        notas: "Trabajamos protocolo de 15 segundos entre puntos (relajación de hombros, mirada en cuerdas, palabra ancla 'Presente').",
      },
      {
        clienteId: cDep.id,
        coachId: coach2.id,
        fecha: manana,
        modalidad: "Virtual",
        estado: "CONFIRMADA",
        enlaceReunion: "https://meet.jit.si/Avanza-Coaching-Deportivo-2",
        notas: "Preparación mental pre-torneo fin de semana.",
      },
    ],
  });

  console.log("✅ Semilla de usuarios y datos de prueba completada con éxito:");
  console.log("   - Dueño / Admin:      dueno@avanza.test       (Avanza2026!)");
  console.log("   - Coach 1 (30%):      coach1@avanza.test      (Avanza2026!)");
  console.log("   - Coach 2 ($1,500):   coach2@avanza.test      (Avanza2026!)");
  console.log("   - Secretaria:         secretaria@avanza.test  (Avanza2026!)");
  console.log("   - Cliente Personal:   personal@avanza.test    (Avanza2026!)");
  console.log("   - Cliente Solicitud:  solicitud@avanza.test   (Avanza2026!)");
  console.log("   - Cliente Voucher:    voucher@avanza.test     (Avanza2026!)");
  console.log("   - Cliente B2B Corp:   corporativo@avanza.test (Avanza2026!)");
  console.log("   - Cliente Deportivo:  deportivo@avanza.test   (Avanza2026!)");
}

main()
  .catch((e) => {
    console.error("Error sembrando datos de prueba:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
