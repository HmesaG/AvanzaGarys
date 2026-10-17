// Queries del panel administrativo.
//
// Viven acá y no dentro de los route handlers para que las vistas de servidor
// puedan reusarlas cuando se migre el frontend, y para que la regla de las dos
// bandejas quede documentada en un solo lugar.
import { db } from "./prisma";
import { EstadoPago } from "../generated/prisma/client";
import type { EstadoPlanGrow, LineaAsesoria } from "../generated/prisma/client";

function inicioDelDia(fecha = new Date()): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

export type StatsDashboard = {
  clientesActivos: number;
  evaluacionesPendientes: number;
  citasHoy: number;
  ingresosMes: number;
};

export async function statsDashboard(): Promise<StatsDashboard> {
  const hoy = inicioDelDia();
  const manana = sumarDias(hoy, 1);
  const inicioDeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioMesSiguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);

  const [clientesActivos, evaluacionesPendientes, citasHoy, ingresos] = await Promise.all([
    db.cliente.count({ where: { usuario: { activo: true } } }),
    db.evaluacion.count({ where: { revisadaPorId: null } }),
    db.cita.count({ where: { fecha: { gte: hoy, lt: manana } } }),
    db.pago.aggregate({
      _sum: { monto: true },
      where: {
        estado: EstadoPago.PAGADO,
        fechaPago: { gte: inicioDeMes, lt: inicioMesSiguiente },
      },
    }),
  ]);

  return {
    clientesActivos,
    evaluacionesPendientes,
    citasHoy,
    // El agregado devuelve Decimal; se serializa a number para el JSON.
    ingresosMes: Number(ingresos._sum.monto ?? 0),
  };
}

/**
 * BANDEJA 1 — Evaluaciones pendientes de revisión. GLOBAL a propósito.
 *
 * DO NOT FILTER por coach — ver ADR 007, "deadlock de cartera del coach".
 * Filtrar esta bandeja por `revisadaPorId = coach.id` hacía que un coach nuevo
 * (sin ninguna evaluación revisada) viera siempre 0 resultados y nunca pudiera
 * ganar su primer cliente. Todos los coaches ven todas las pendientes; la
 * cartera personal es la otra bandeja, `clientesDelCoach()`.
 */
export async function evaluacionesPendientes() {
  return db.evaluacion.findMany({
    where: { revisadaPorId: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      objetivoPrincipal: true,
      tiempoObjetivo: true,
      createdAt: true,
      cliente: {
        select: {
          id: true,
          linea: true,
          telefono: true,
          coachId: true,
          usuario: { select: { nombre: true, email: true } },
        },
      },
    },
  });
}

export type FiltroClientes = {
  /** BANDEJA 2 — "mis clientes": sólo los que este coach ya tomó. */
  coachId?: string;
  linea?: LineaAsesoria;
  busqueda?: string;
};

export async function listarClientes(filtro: FiltroClientes = {}) {
  return db.cliente.findMany({
    where: {
      ...(filtro.coachId ? { coachId: filtro.coachId } : {}),
      ...(filtro.linea ? { linea: filtro.linea } : {}),
      ...(filtro.busqueda
        ? {
            usuario: {
              OR: [
                { nombre: { contains: filtro.busqueda } },
                { email: { contains: filtro.busqueda } },
              ],
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      linea: true,
      telefono: true,
      createdAt: true,
      usuario: { select: { id: true, nombre: true, email: true, activo: true } },
      coach: { select: { id: true, nombre: true } },
      empresa: { select: { id: true, nombre: true } },
      _count: { select: { programas: true, citas: true, evaluaciones: true } },
    },
  });
}

export async function clienteDetalle(clienteId: string) {
  const cliente = await db.cliente.findUnique({
    where: { id: clienteId },
    select: {
      id: true,
      linea: true,
      telefono: true,
      createdAt: true,
      usuario: { select: { id: true, nombre: true, email: true, activo: true } },
      coach: { select: { id: true, nombre: true } },
      empresa: { select: { id: true, nombre: true } },
      diagnostico: true,
      diagnosticoDeportivo: true,
      evaluaciones: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          objetivoPrincipal: true,
          principalDificultad: true,
          tiempoObjetivo: true,
          respuestas: true,
          revisadaAt: true,
          createdAt: true,
          revisadaPor: { select: { id: true, nombre: true } },
        },
      },
      programas: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          progreso: true,
          activo: true,
          consentimientoAceptado: true,
        },
      },
      citas: {
        orderBy: { fecha: "desc" },
        take: 20,
        select: { id: true, fecha: true, modalidad: true, estado: true, notas: true },
      },
      pagos: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, monto: true, estado: true, metodo: true, concepto: true, fechaPago: true },
      },
      tareas: {
        orderBy: { createdAt: "asc" },
        select: { id: true, label: true, completada: true },
      },
    },
  });

  if (!cliente) return null;

  return {
    ...cliente,
    pagos: cliente.pagos.map((pago) => ({ ...pago, monto: Number(pago.monto) })),
  };
}

export type FiltroCitas = {
  desde: Date;
  hasta: Date;
  clienteId?: string;
  coachId?: string;
};

// --- Empresas (Fase 5 — coaching organizacional) ---------------------------

export async function listarEmpresas() {
  return db.empresa.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, _count: { select: { clientes: true } } },
  });
}

export async function crearEmpresa(datos: { nombre: string; ruc?: string | null; telefono?: string | null }) {
  return db.empresa.create({
    data: { nombre: datos.nombre, ruc: datos.ruc ?? null, telefono: datos.telefono ?? null },
    select: { id: true, nombre: true },
  });
}

export async function obtenerEmpresaDetalle(empresaId: string) {
  const empresa = await db.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nombre: true,
      ruc: true,
      telefono: true,
      clientes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          usuario: { select: { nombre: true, email: true } },
          diagnostico: {
            select: {
              climaLaboral: true,
              principalDesafio: true,
              nivelComunicacion: true,
              objetivoEmpresa: true,
            },
          },
        },
      },
    },
  });

  if (!empresa) return null;

  const totalClientes = empresa.clientes.length;
  const conDiagnostico = empresa.clientes.filter((c) => c.diagnostico !== null);
  const tasaCompletado = totalClientes > 0 ? Math.round((conDiagnostico.length / totalClientes) * 100) : 0;

  const nivelesComunicacion: Record<string, number> = { BUENA: 0, REGULAR: 0, DEFICIENTE: 0 };
  for (const c of conDiagnostico) {
    if (c.diagnostico?.nivelComunicacion) {
      nivelesComunicacion[c.diagnostico.nivelComunicacion] =
        (nivelesComunicacion[c.diagnostico.nivelComunicacion] ?? 0) + 1;
    }
  }

  return {
    ...empresa,
    metricas: {
      totalColaboradores: totalClientes,
      diagnosticosCompletados: conDiagnostico.length,
      tasaCompletado,
      nivelesComunicacion,
      desafios: conDiagnostico.map((c) => ({
        colaborador: c.usuario.nombre,
        desafio: c.diagnostico!.principalDesafio,
        clima: c.diagnostico!.climaLaboral,
      })),
    },
    clientes: empresa.clientes.map((c) => ({
      id: c.id,
      nombre: c.usuario.nombre,
      email: c.usuario.email,
      diagnosticoCompletado: c.diagnostico !== null,
      diagnostico: c.diagnostico,
    })),
  };
}

// --- Planes GROW (Fase 4b, prototipo sin IA) --------------------------------

export async function listarPlanesGrow() {
  return db.planGrow.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      tipo: true,
      semanaActual: true,
      totalSemanas: true,
      estado: true,
      updatedAt: true,
      cliente: { select: { id: true, usuario: { select: { nombre: true, email: true } } } },
    },
  });
}

export async function obtenerPlanGrowDetalle(clienteId: string) {
  return db.planGrow.findFirst({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tipo: true,
      semanaActual: true,
      totalSemanas: true,
      estado: true,
      cliente: { select: { id: true, usuario: { select: { nombre: true, email: true } } } },
      sesiones: {
        orderBy: { semana: "asc" },
        select: {
          id: true,
          semana: true,
          etapa: true,
          respuestas: true,
          notaCoach: true,
          completadaAt: true,
          compromisos: {
            select: { id: true, accion: true, fechaPrevista: true, estado: true, resultado: true },
          },
        },
      },
    },
  });
}

export async function agregarNotaSesion(sesionId: string, nota: string) {
  return db.sesionGrow.update({
    where: { id: sesionId },
    data: { notaCoach: nota },
    select: { id: true, notaCoach: true },
  });
}

export async function cambiarEstadoPlan(
  planId: string,
  estado: Extract<EstadoPlanGrow, "ACTIVO" | "PAUSADO" | "CERRADO">,
) {
  return db.planGrow.update({
    where: { id: planId },
    data: { estado },
    select: { id: true, estado: true },
  });
}

export async function listarCitas(filtro: FiltroCitas) {
  return db.cita.findMany({
    where: {
      fecha: { gte: filtro.desde, lt: filtro.hasta },
      ...(filtro.clienteId ? { clienteId: filtro.clienteId } : {}),
      ...(filtro.coachId ? { coachId: filtro.coachId } : {}),
    },
    orderBy: { fecha: "asc" },
    select: {
      id: true,
      fecha: true,
      modalidad: true,
      estado: true,
      notas: true,
      cliente: {
        select: { id: true, linea: true, usuario: { select: { nombre: true, email: true } } },
      },
      coach: { select: { id: true, nombre: true } },
    },
  });
}

export async function obtenerMetricasGraficos() {
  const ahora = new Date();

  // 1. Distribución de líneas
  const [personal, corporativo, deportivo] = await Promise.all([
    db.cliente.count({ where: { linea: "PERSONAL" } }),
    db.cliente.count({ where: { linea: "CORPORATIVO" } }),
    db.cliente.count({ where: { linea: "DEPORTIVO" } }),
  ]);
  const totalLineas = Math.max(1, personal + corporativo + deportivo);

  const distribucionLineas = [
    {
      linea: "Personal / Ejecutivo",
      cantidad: personal,
      porcentaje: Math.round((personal / totalLineas) * 100),
      color: "#059669",
    },
    {
      linea: "Coaching Corporativo",
      cantidad: corporativo,
      porcentaje: Math.round((corporativo / totalLineas) * 100),
      color: "#0284c7",
    },
    {
      linea: "Coaching Deportivo",
      cantidad: deportivo,
      porcentaje: Math.round((deportivo / totalLineas) * 100),
      color: "#d97706",
    },
  ];

  // 2. Ingresos de los últimos 6 meses
  const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const ingresosMensuales = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const finMes = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const pagos = await db.pago.findMany({
      where: {
        estado: "PAGADO",
        fechaPago: { gte: d, lte: finMes },
      },
      select: { monto: true },
    });

    const suma = pagos.reduce((acc, p) => acc + Number(p.monto), 0);
    ingresosMensuales.push({
      mes: nombresMeses[d.getMonth()],
      monto: suma,
    });
  }

  // 3. Cumplimiento GROW
  const [cumplidos, totalCompromisos] = await Promise.all([
    db.compromisoGrow.count({ where: { estado: "CUMPLIDO" } }),
    db.compromisoGrow.count(),
  ]);
  const tasaCumplimientoGrow =
    totalCompromisos > 0 ? Math.round((cumplidos / totalCompromisos) * 100) : 85;

  return {
    ingresosMensuales,
    distribucionLineas,
    tasaCumplimientoGrow,
  };
}

