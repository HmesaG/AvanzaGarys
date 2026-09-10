// Queries del panel administrativo.
//
// Viven acá y no dentro de los route handlers para que las vistas de servidor
// puedan reusarlas cuando se migre el frontend, y para que la regla de las dos
// bandejas quede documentada en un solo lugar.
import { db } from "./prisma";
import { EstadoPago } from "../generated/prisma/client";
import type { LineaAsesoria } from "../generated/prisma/client";

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
      evaluaciones: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          objetivoPrincipal: true,
          tiempoObjetivo: true,
          respuestas: true,
          revisadaAt: true,
          createdAt: true,
          revisadaPor: { select: { id: true, nombre: true } },
        },
      },
      programas: {
        orderBy: { createdAt: "desc" },
        select: { id: true, nombre: true, descripcion: true, progreso: true, activo: true },
      },
      citas: {
        orderBy: { fecha: "desc" },
        take: 20,
        select: { id: true, fecha: true, modalidad: true, estado: true, notas: true },
      },
      pagos: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, monto: true, estado: true, concepto: true, fechaPago: true },
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
