// Queries del panel administrativo — Fase 3a.
//
// Devuelven exactamente las formas que ya consumía la UI desde
// `lib/admin-mock-data.ts` (`DashboardStats`, `ClienteAdmin`, `CitaAdmin`), de
// modo que la migración mock -> real no obligue a rediseñar los componentes.
// El mapeo de enums de base de datos (MAYÚSCULAS) a los labels de UI vive acá.

import { prisma } from "@/lib/prisma";
import { Rol, type TipoAsesoria } from "../../generated/enums";
import type { SessionData } from "./session";
import type {
  CitaAdmin,
  ClienteAdmin,
  DashboardStats,
  EstadoCita,
  LineaAsesoriaAdmin,
} from "@/lib/admin-mock-data";

// --- Mapeo enums de BD -> formas de UI ---------------------------------------

const LINEA_POR_TIPO: Record<TipoAsesoria, LineaAsesoriaAdmin> = {
  PERSONAL: "Personal",
  CORPORATIVO: "Corporativo",
  DEPORTIVO: "Deportivo",
};

export function lineaAsesoria(tipo: TipoAsesoria): LineaAsesoriaAdmin {
  return LINEA_POR_TIPO[tipo];
}

/** "María Fernández" -> "MF" (máximo dos letras, igual que los mocks). */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

/**
 * `Cita.fecha` es una columna DATE: se formatea en UTC para que no se corra un
 * día según la zona horaria del servidor.
 */
function fechaIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

// --- Filtro por rol -----------------------------------------------------------

/**
 * Alcance de clientes visible para la sesión.
 *
 * Administrador y Secretaria ven toda la cartera. Un Coach ve solo los clientes
 * de los que ya revisó alguna evaluación (`revisadaPorId`), que es la única
 * relación coach-cliente que existe hoy en el schema.
 */
function filtroClientesPorRol(session: SessionData) {
  if (session.rol !== Rol.COACH) return {};
  return {
    evaluaciones: { some: { revisadaPorId: session.usuarioId } },
  };
}

/**
 * Las evaluaciones PENDIENTES son una bandeja compartida: todavía no tienen
 * revisor (`revisadaPorId` se llena recién al aprobar/rechazar), así que NO se
 * filtran por cartera. Si se filtraran, un Coach nuevo vería la bandeja vacía y
 * nunca podría revisar nada — y como su cartera se deriva justamente de las
 * evaluaciones que revisó, jamás llegaría a tener clientes.
 */

// --- Dashboard ----------------------------------------------------------------

export type EvaluacionPendiente = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  linea: LineaAsesoriaAdmin;
  objetivoPrincipal: string;
  principalDificultad: string;
  tiempoDeseado: string;
  programasDisponibles: { id: string; nombre: string }[];
};

export async function obtenerDashboardStats(session: SessionData): Promise<DashboardStats> {
  const whereCliente = filtroClientesPorRol(session);

  const hoy = new Date();
  const inicioDia = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  const finDia = new Date(inicioDia);
  finDia.setUTCDate(finDia.getUTCDate() + 1);
  const inicioMes = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), 1));
  const finMes = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth() + 1, 1));

  const [clientesActivos, citasHoy, pendientes, ingresos] = await Promise.all([
    prisma.cliente.count({ where: whereCliente }),
    prisma.cita.count({
      where: { fecha: { gte: inicioDia, lt: finDia }, cliente: whereCliente },
    }),
    // "Pendientes" refleja la bandeja compartida, igual que el listado.
    prisma.evaluacion.count({ where: { estado: "PENDIENTE" } }),
    prisma.pago.aggregate({
      _sum: { monto: true },
      where: {
        estado: "PAGADO",
        fecha: { gte: inicioMes, lt: finMes },
        cliente: whereCliente,
      },
    }),
  ]);

  return {
    clientesActivos,
    citasHoy,
    pendientes,
    // `monto` es Decimal: se convierte a number para que sea serializable a JSON.
    ingresosMes: Number(ingresos._sum.monto ?? 0),
  };
}

export async function obtenerEvaluacionesPendientes(
  session: SessionData,
): Promise<EvaluacionPendiente[]> {
  const evaluaciones = await prisma.evaluacion.findMany({
    where: { estado: "PENDIENTE" },
    include: { cliente: true },
    orderBy: { createdAt: "asc" },
  });

  if (evaluaciones.length === 0) return [];

  // Un solo query para el catálogo: se agrupa en memoria por línea de asesoría.
  const programas = await prisma.programa.findMany({
    select: { id: true, nombre: true, tipoAsesoria: true },
    orderBy: { precio: "asc" },
  });

  return evaluaciones.map((evaluacion) => ({
    id: evaluacion.id,
    clienteId: evaluacion.clienteId,
    clienteNombre: evaluacion.cliente.nombreCompleto,
    linea: lineaAsesoria(evaluacion.cliente.tipoAsesoria),
    objetivoPrincipal: evaluacion.objetivoPrincipal,
    principalDificultad: evaluacion.principalDificultad,
    tiempoDeseado: evaluacion.tiempoDeseado,
    programasDisponibles: programas
      .filter((p) => p.tipoAsesoria === evaluacion.cliente.tipoAsesoria)
      .map(({ id, nombre }) => ({ id, nombre })),
  }));
}

// --- Clientes -----------------------------------------------------------------

export async function listarClientes(session: SessionData): Promise<ClienteAdmin[]> {
  const clientes = await prisma.cliente.findMany({
    where: filtroClientesPorRol(session),
    include: { usuario: { select: { correo: true } } },
    orderBy: { nombreCompleto: "asc" },
  });

  return clientes.map((cliente) => ({
    id: cliente.id,
    nombre: cliente.nombreCompleto,
    iniciales: iniciales(cliente.nombreCompleto),
    linea: lineaAsesoria(cliente.tipoAsesoria),
    telefono: cliente.telefono,
    correo: cliente.usuario.correo,
  }));
}

export type ClienteDetalle = ClienteAdmin & {
  edad: number;
  citas: CitaAdmin[];
  evaluaciones: {
    id: string;
    estado: string;
    objetivoPrincipal: string;
    createdAt: string;
  }[];
  programas: { id: string; nombre: string; asignadoEn: string }[];
};

export async function obtenerClienteDetalle(
  session: SessionData,
  clienteId: string,
): Promise<ClienteDetalle | null> {
  const cliente = await prisma.cliente.findFirst({
    // El filtro por rol va en el where, no en un chequeo posterior: un Coach que
    // pide el id de un cliente ajeno recibe 404, no el detalle.
    where: { id: clienteId, ...filtroClientesPorRol(session) },
    include: {
      usuario: { select: { correo: true } },
      citas: { orderBy: { fecha: "desc" } },
      evaluaciones: { orderBy: { createdAt: "desc" } },
      programasAsignados: { include: { programa: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!cliente) return null;

  const nombre = cliente.nombreCompleto;
  const inicialesCliente = iniciales(nombre);

  return {
    id: cliente.id,
    nombre,
    iniciales: inicialesCliente,
    linea: lineaAsesoria(cliente.tipoAsesoria),
    telefono: cliente.telefono,
    correo: cliente.usuario.correo,
    edad: cliente.edad,
    citas: cliente.citas.map((cita) => ({
      id: cita.id,
      clienteId: cliente.id,
      clienteNombre: nombre,
      clienteIniciales: inicialesCliente,
      fecha: fechaIso(cita.fecha),
      hora: cita.hora,
      modalidad: cita.modalidad === "VIRTUAL" ? "Virtual" : "Presencial",
      estado: cita.estado.toLowerCase() as EstadoCita,
    })),
    evaluaciones: cliente.evaluaciones.map((evaluacion) => ({
      id: evaluacion.id,
      estado: evaluacion.estado,
      objetivoPrincipal: evaluacion.objetivoPrincipal,
      createdAt: evaluacion.createdAt.toISOString(),
    })),
    programas: cliente.programasAsignados.map((asignado) => ({
      id: asignado.programa.id,
      nombre: asignado.programa.nombre,
      asignadoEn: asignado.createdAt.toISOString(),
    })),
  };
}

// --- Citas --------------------------------------------------------------------

export async function listarCitas(session: SessionData): Promise<CitaAdmin[]> {
  const citas = await prisma.cita.findMany({
    where: { cliente: filtroClientesPorRol(session) },
    include: { cliente: { select: { id: true, nombreCompleto: true } } },
    orderBy: { fecha: "asc" },
  });

  return citas.map((cita) => ({
    id: cita.id,
    clienteId: cita.cliente.id,
    clienteNombre: cita.cliente.nombreCompleto,
    clienteIniciales: iniciales(cita.cliente.nombreCompleto),
    fecha: fechaIso(cita.fecha),
    hora: cita.hora,
    modalidad: cita.modalidad === "VIRTUAL" ? "Virtual" : "Presencial",
    estado: cita.estado.toLowerCase() as EstadoCita,
  }));
}
