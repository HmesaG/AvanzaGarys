// Queries del área de cliente — Fase 3a Entrega 2.
//
// Todo el scoping se deriva de `session.usuarioId` -> `Cliente.usuarioId`. Ningún
// handler acepta un id de cliente por URL o body: un cliente solo puede leer y
// escribir su propia fila (sin esto, cada endpoint sería un IDOR abierto).
//
// Las formas devueltas replican las que la UI ya consumía desde
// `lib/client-state.ts`, para que la migración localStorage -> API no obligue a
// rediseñar las pantallas.

import { prisma } from "@/lib/prisma";
import { authErrorResponse } from "./auth";
import type { SessionData } from "./session";
import type { EstadoPago, MetodoPago, TipoAsesoria } from "../../generated/enums";

/** Error de regla de negocio del área de cliente (no de autenticación). */
export class ClienteError extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = "ClienteError";
  }
}

/**
 * Traduce errores de negocio y de autenticación a Response. Se usa en el `catch`
 * de todos los handlers de `/api/cliente/*`, igual que `authErrorResponse` en
 * `/api/admin/*` (al que delega para AuthError).
 */
export function clienteErrorResponse(error: unknown): Response {
  if (error instanceof ClienteError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return authErrorResponse(error);
}

// --- Formas devueltas a la UI -------------------------------------------------

export type PerfilCliente = {
  id: string;
  nombreCompleto: string;
  telefono: string;
  correo: string;
  edad: number;
  tipoAsesoria: TipoAsesoria;
};

export type EvaluacionCliente = {
  id: string;
  objetivoPrincipal: string;
  principalDificultad: string;
  tiempoDeseado: string;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
};

export type ProgramaCliente = {
  id: string;
  nombre: string;
  descripcion: string;
  sesionesIncluidas: number;
  precio: number;
};

export type ConsentimientoCliente = {
  aceptado: boolean;
  fecha: string;
};

export type PagoCliente = {
  id: string;
  monto: number;
  metodo: MetodoPago;
  estado: EstadoPago;
  fecha: string | null;
};

export type CitaCliente = {
  id: string;
  fecha: string;
  hora: string;
  modalidad: "Virtual" | "Presencial";
  estado: "confirmada" | "pendiente";
};

export type MensajeCliente = {
  id: string;
  de: "cliente" | "asesor";
  texto: string;
  hora: string;
};

/**
 * Estado agregado del cliente en sesión: es exactamente lo que `home`, `perfil`,
 * `proceso`, `programa` y `agenda` necesitan para renderizar. Se resuelve en un
 * solo endpoint (`GET /api/cliente/estado`) porque las cinco pantallas piden
 * casi el mismo conjunto; partirlo en cinco endpoints chicos solo multiplicaría
 * round-trips sin ahorrar trabajo en la base.
 */
export type EstadoCliente = {
  perfil: PerfilCliente;
  evaluacion: EvaluacionCliente | null;
  programaAsignado: ProgramaCliente | null;
  consentimiento: ConsentimientoCliente | null;
  pago: PagoCliente | null;
  proximaCita: CitaCliente | null;
  puedeAgendar: boolean;
};

// --- Helpers ------------------------------------------------------------------

/** `Cita.fecha` es una columna DATE: se formatea en UTC para no correr un día. */
export function fechaIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Medianoche UTC del día indicado (`2026-08-15` -> Date). */
export function fechaDesdeIso(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Medianoche UTC de hoy — límite inferior de "próximas citas". */
export function inicioDeHoyUtc(): Date {
  const hoy = new Date();
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
}

function mapCita(cita: {
  id: string;
  fecha: Date;
  hora: string;
  modalidad: string;
  estado: string;
}): CitaCliente {
  return {
    id: cita.id,
    fecha: fechaIso(cita.fecha),
    hora: cita.hora,
    modalidad: cita.modalidad === "VIRTUAL" ? "Virtual" : "Presencial",
    estado: cita.estado === "CONFIRMADA" ? "confirmada" : "pendiente",
  };
}

/**
 * El "pago vigente" es el PENDIENTE si existe; si no, el PAGADO más reciente.
 * `Pago` no tiene `createdAt`, así que no se puede ordenar por creación: esta
 * regla es determinística sin depender del orden de inserción.
 */
function pagoVigente(
  pagos: { id: string; monto: unknown; metodo: MetodoPago; estado: EstadoPago; fecha: Date | null }[],
): PagoCliente | null {
  const pendiente = pagos.find((p) => p.estado === "PENDIENTE");
  const elegido =
    pendiente ??
    pagos
      .filter((p) => p.estado === "PAGADO")
      .sort((a, b) => (b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0))[0];

  if (!elegido) return null;

  return {
    id: elegido.id,
    // `monto` es Decimal: se convierte a number para que sea serializable a JSON.
    monto: Number(elegido.monto),
    metodo: elegido.metodo,
    estado: elegido.estado,
    fecha: elegido.fecha?.toISOString() ?? null,
  };
}

// --- Cliente en sesión --------------------------------------------------------

/**
 * Resuelve el `Cliente` de la sesión. Un usuario con rol CLIENTE siempre debería
 * tener su fila (el registro las crea en la misma transacción); si no la tiene,
 * es un dato inconsistente y no una sesión inválida.
 */
export async function clienteIdDeSesion(session: SessionData): Promise<string> {
  const cliente = await prisma.cliente.findUnique({
    where: { usuarioId: session.usuarioId },
    select: { id: true },
  });
  if (!cliente) {
    throw new ClienteError(404, "No hay un perfil de cliente asociado a esta cuenta");
  }
  return cliente.id;
}

export async function obtenerPerfil(session: SessionData): Promise<PerfilCliente> {
  const cliente = await prisma.cliente.findUnique({
    where: { usuarioId: session.usuarioId },
    include: { usuario: { select: { correo: true } } },
  });
  if (!cliente) {
    throw new ClienteError(404, "No hay un perfil de cliente asociado a esta cuenta");
  }

  return {
    id: cliente.id,
    nombreCompleto: cliente.nombreCompleto,
    telefono: cliente.telefono,
    correo: cliente.usuario.correo,
    edad: cliente.edad,
    tipoAsesoria: cliente.tipoAsesoria,
  };
}

export async function obtenerEstado(session: SessionData): Promise<EstadoCliente> {
  const cliente = await prisma.cliente.findUnique({
    where: { usuarioId: session.usuarioId },
    include: {
      usuario: { select: { correo: true } },
      evaluaciones: { orderBy: { createdAt: "desc" }, take: 1 },
      programasAsignados: {
        include: { programa: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      consentimiento: true,
      pagos: true,
      citas: { where: { fecha: { gte: inicioDeHoyUtc() } }, orderBy: { fecha: "asc" }, take: 1 },
    },
  });

  if (!cliente) {
    throw new ClienteError(404, "No hay un perfil de cliente asociado a esta cuenta");
  }

  const evaluacion = cliente.evaluaciones[0] ?? null;
  const asignacion = cliente.programasAsignados[0] ?? null;
  const pago = pagoVigente(cliente.pagos);
  const consentimiento = cliente.consentimiento;

  // El programa solo se muestra si corresponde a la evaluación vigente: si el
  // cliente reenvió una evaluación tras un rechazo, el programa de un ciclo
  // anterior no debe reaparecer como si fuera el actual.
  const programaVigente = asignacion && evaluacion && asignacion.evaluacionId === evaluacion.id;

  return {
    perfil: {
      id: cliente.id,
      nombreCompleto: cliente.nombreCompleto,
      telefono: cliente.telefono,
      correo: cliente.usuario.correo,
      edad: cliente.edad,
      tipoAsesoria: cliente.tipoAsesoria,
    },
    evaluacion: evaluacion
      ? {
          id: evaluacion.id,
          objetivoPrincipal: evaluacion.objetivoPrincipal,
          principalDificultad: evaluacion.principalDificultad,
          tiempoDeseado: evaluacion.tiempoDeseado,
          estado: evaluacion.estado,
        }
      : null,
    programaAsignado:
      programaVigente && asignacion
        ? {
            id: asignacion.programa.id,
            nombre: asignacion.programa.nombre,
            descripcion: asignacion.programa.descripcion,
            sesionesIncluidas: asignacion.programa.sesionesIncluidas,
            precio: Number(asignacion.programa.precio),
          }
        : null,
    consentimiento: consentimiento
      ? { aceptado: consentimiento.aceptado, fecha: consentimiento.fecha.toISOString() }
      : null,
    pago,
    proximaCita: cliente.citas[0] ? mapCita(cliente.citas[0]) : null,
    puedeAgendar: Boolean(consentimiento?.aceptado && pago?.estado === "PAGADO"),
  };
}

/**
 * Misma regla que `puedeAgendar()` validaba en localStorage, pero resuelta
 * contra la base: consentimiento aceptado + pago registrado. Se revalida en el
 * servidor porque la UI puede estar desactualizada o directamente saltearse.
 */
export async function puedeAgendar(clienteId: string): Promise<boolean> {
  const [consentimiento, pagado] = await Promise.all([
    prisma.consentimiento.findUnique({ where: { clienteId }, select: { aceptado: true } }),
    prisma.pago.count({ where: { clienteId, estado: "PAGADO" } }),
  ]);
  return Boolean(consentimiento?.aceptado) && pagado > 0;
}

export async function listarCitas(clienteId: string): Promise<CitaCliente[]> {
  const citas = await prisma.cita.findMany({
    where: { clienteId, fecha: { gte: inicioDeHoyUtc() } },
    orderBy: { fecha: "asc" },
  });
  return citas.map(mapCita);
}

export async function listarMensajes(clienteId: string): Promise<MensajeCliente[]> {
  const mensajes = await prisma.mensaje.findMany({
    where: { clienteId },
    orderBy: { hora: "asc" },
  });

  return mensajes.map((mensaje) => ({
    id: mensaje.id,
    de: mensaje.de === "CLIENTE" ? "cliente" : "asesor",
    // La hora se formatea en el cliente (locale del navegador), igual que hacía
    // el mock con `toLocaleTimeString`.
    hora: mensaje.hora.toISOString(),
    texto: mensaje.texto,
  }));
}
