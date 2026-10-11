// Queries del lado cliente — equivalente de lib/admin-queries.ts pero para las
// 8 páginas de /app que hablan en nombre de "el cliente autenticado".
//
// Regla anti-IDOR: toda función recibe `clienteId` derivado de la sesión
// (nunca de un parámetro de la URL/body) — mismo patrón que
// lib/autorizacion.ts usa para el lado admin.
import { db } from "./prisma";
import { ApiError } from "./http";
import { EstadoPago } from "../generated/prisma/client";
import type { NivelComunicacion } from "../generated/prisma/client";

const TAREAS_GENERICAS = [
  "Ejercicio de autoconocimiento",
  "Diario emocional",
  "Técnicas de respiración",
];

// --- Estado agregado -------------------------------------------------------

export async function obtenerEstado(clienteId: string) {
  const cliente = await db.cliente.findUniqueOrThrow({
    where: { id: clienteId },
    select: {
      linea: true,
      empresaId: true,
      evaluaciones: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          objetivoPrincipal: true,
          principalDificultad: true,
          tiempoObjetivo: true,
          revisadaPorId: true,
          revisadaAt: true,
          createdAt: true,
        },
      },
      programas: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          progreso: true,
          activo: true,
          consentimientoAceptado: true,
          consentimientoAt: true,
        },
      },
      pagos: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, monto: true, estado: true, metodo: true, concepto: true, fechaPago: true },
      },
      citas: {
        where: { fecha: { gte: new Date() } },
        orderBy: { fecha: "asc" },
        take: 1,
        select: { id: true, fecha: true, modalidad: true, estado: true },
      },
      tareas: {
        orderBy: { createdAt: "asc" },
        select: { id: true, label: true, completada: true },
      },
      diagnostico: {
        select: { id: true },
      },
    },
  });

  const evaluacion = cliente.evaluaciones[0] ?? null;
  const programa = cliente.programas[0] ?? null;
  const pago = cliente.pagos[0] ?? null;
  const proximaCita = cliente.citas[0] ?? null;

  const puedeAgendar = Boolean(programa?.consentimientoAceptado) && pago?.estado === EstadoPago.PAGADO;

  const completadas = cliente.tareas.filter((t) => t.completada).length;
  const totalTareas = cliente.tareas.length;

  return {
    linea: cliente.linea,
    requiereDiagnostico: cliente.linea === "CORPORATIVO" && Boolean(cliente.empresaId),
    diagnosticoCompletado: cliente.diagnostico !== null,
    evaluacion: evaluacion
      ? {
          ...evaluacion,
          estado: evaluacion.revisadaPorId ? "REVISADA" : "PENDIENTE",
        }
      : null,
    programa: programa
      ? {
          ...programa,
          monto: pago ? Number(pago.monto) : null,
        }
      : null,
    pago: pago ? { ...pago, monto: Number(pago.monto) } : null,
    proximaCita,
    tareas: cliente.tareas,
    progreso: {
      completadas,
      total: totalTareas,
      porcentaje: totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0,
    },
    puedeAgendar,
  };
}

// --- Evaluación --------------------------------------------------------------

export type DatosEvaluacion = {
  objetivoPrincipal: string;
  principalDificultad: string;
  tiempoObjetivo: string;
};

/** Sólo se puede volver a enviar si la anterior no existe o fue rechazada. */
export async function crearEvaluacion(clienteId: string, datos: DatosEvaluacion) {
  const ultima = await db.evaluacion.findFirst({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
    select: { id: true, revisadaPorId: true },
  });

  // "Rechazada" no existe como estado explícito hoy (sólo revisada/no
  // revisada) — una evaluación pendiente bloquea un reenvío para no dejar
  // a un coach revisando una copia vieja mientras otra está en vuelo.
  if (ultima && !ultima.revisadaPorId) {
    throw new ApiError(409, "Ya tenés una evaluación pendiente de revisión", "evaluacion_pendiente");
  }

  return db.evaluacion.create({
    data: {
      clienteId,
      objetivoPrincipal: datos.objetivoPrincipal,
      principalDificultad: datos.principalDificultad,
      tiempoObjetivo: datos.tiempoObjetivo,
      respuestas: datos,
    },
    select: { id: true, objetivoPrincipal: true, principalDificultad: true, createdAt: true },
  });
}

// --- Programa: consentimiento + pago ----------------------------------------

async function programaActivoDelCliente(clienteId: string) {
  const programa = await db.programa.findFirst({
    where: { clienteId, activo: true },
    orderBy: { createdAt: "desc" },
  });
  if (!programa) {
    throw new ApiError(404, "Todavía no tenés un programa asignado", "sin_programa");
  }
  return programa;
}

export async function registrarConsentimiento(clienteId: string) {
  const programa = await programaActivoDelCliente(clienteId);
  if (programa.consentimientoAceptado) {
    throw new ApiError(409, "Ya aceptaste el consentimiento de este programa", "ya_aceptado");
  }

  return db.programa.update({
    where: { id: programa.id },
    data: { consentimientoAceptado: true, consentimientoAt: new Date() },
    select: { id: true, consentimientoAceptado: true, consentimientoAt: true },
  });
}

export async function registrarPago(clienteId: string, metodo: string) {
  const programa = await programaActivoDelCliente(clienteId);
  if (!programa.consentimientoAceptado) {
    throw new ApiError(409, "Aceptá el consentimiento antes de pagar", "sin_consentimiento");
  }

  const pago = await db.pago.findFirst({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
  });
  if (!pago) {
    throw new ApiError(404, "No hay un pago pendiente para este programa", "sin_pago");
  }
  if (pago.estado === EstadoPago.PAGADO) {
    throw new ApiError(409, "Este pago ya fue registrado", "ya_pagado");
  }

  // El monto NUNCA viene del cliente: ya está fijado en el Pago creado al
  // aprobar la evaluación (ver app/api/admin/evaluaciones/[id]/aprobar).
  return db.pago.update({
    where: { id: pago.id },
    data: { estado: EstadoPago.PAGADO, metodo, fechaPago: new Date() },
    select: { id: true, monto: true, estado: true, metodo: true, fechaPago: true },
  });
}

// --- Citas -------------------------------------------------------------------

export async function listarCitasCliente(clienteId: string) {
  return db.cita.findMany({
    where: { clienteId },
    orderBy: { fecha: "desc" },
    select: { id: true, fecha: true, modalidad: true, estado: true, notas: true },
  });
}

export async function crearCitaCliente(
  clienteId: string,
  datos: { fecha: Date; modalidad: string },
) {
  const estado = await obtenerEstado(clienteId);
  if (!estado.puedeAgendar) {
    throw new ApiError(403, "Todavía no podés agendar — falta consentimiento o pago", "no_puede_agendar");
  }

  const existente = await db.cita.findFirst({
    where: { clienteId, fecha: { gte: new Date() }, estado: { not: "CANCELADA" } },
  });
  if (existente) {
    throw new ApiError(409, "Ya tenés una próxima sesión agendada — cancelala para mover la fecha", "cita_existente");
  }

  const cliente = await db.cliente.findUnique({ where: { id: clienteId }, select: { coachId: true } });

  return db.cita.create({
    data: {
      clienteId,
      coachId: cliente?.coachId ?? null,
      fecha: datos.fecha,
      modalidad: datos.modalidad,
    },
    select: { id: true, fecha: true, modalidad: true, estado: true },
  });
}

export async function cancelarCitaCliente(clienteId: string, citaId: string) {
  const cita = await db.cita.findUnique({ where: { id: citaId }, select: { id: true, clienteId: true } });
  if (!cita || cita.clienteId !== clienteId) {
    throw new ApiError(404, "La cita no existe", "no_encontrada");
  }

  return db.cita.update({
    where: { id: citaId },
    data: { estado: "CANCELADA" },
    select: { id: true, estado: true },
  });
}

// --- Mensajes ----------------------------------------------------------------

export async function listarMensajesCliente(clienteId: string) {
  return db.mensaje.findMany({
    where: { clienteId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      texto: true,
      createdAt: true,
      de: { select: { id: true, rol: true } },
    },
  });
}

export async function crearMensajeCliente(clienteId: string, usuarioId: string, texto: string) {
  return db.mensaje.create({
    data: { clienteId, deId: usuarioId, texto },
    select: { id: true, texto: true, createdAt: true },
  });
}

// --- Tareas ------------------------------------------------------------------

export async function alternarTarea(clienteId: string, tareaId: string) {
  const tarea = await db.tarea.findUnique({ where: { id: tareaId }, select: { id: true, clienteId: true, completada: true } });
  if (!tarea || tarea.clienteId !== clienteId) {
    throw new ApiError(404, "La tarea no existe", "no_encontrada");
  }

  return db.tarea.update({
    where: { id: tareaId },
    data: { completada: !tarea.completada },
    select: { id: true, completada: true },
  });
}

/** Siembra las tareas genéricas al aprobar una evaluación (ver ruta de aprobar). */
export function tareasGenericasParaCrear(clienteId: string) {
  return TAREAS_GENERICAS.map((label) => ({ clienteId, label }));
}

// --- Diagnóstico organizacional -----------------------------------------------

export type DatosDiagnostico = {
  climaLaboral: string;
  principalDesafio: string;
  nivelComunicacion: NivelComunicacion;
  objetivoEmpresa: string;
};

export async function crearDiagnostico(clienteId: string, datos: DatosDiagnostico) {
  const existente = await db.diagnostico.findUnique({ where: { clienteId } });
  if (existente) {
    throw new ApiError(409, "Ya completaste tu diagnóstico organizacional", "ya_completado");
  }

  return db.diagnostico.create({
    data: { clienteId, ...datos },
    select: { id: true, createdAt: true },
  });
}
