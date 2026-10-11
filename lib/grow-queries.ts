// Motor GROW — capa de datos. Mismo patrón anti-IDOR que lib/cliente-queries.ts:
// todo scoping es por clienteId derivado de la sesión, nunca de un parámetro.
import { db } from "./prisma";
import { ApiError } from "./http";
import { obtenerEstado } from "./cliente-queries";
import { COMPROMISOS_REQUERIDOS, ETAPA_POR_SEMANA, siguienteEtapa } from "./grow-constants";
import { EstadoCompromiso, EstadoPlanGrow, EtapaGrow } from "../generated/prisma/client";

export type RespuestaGrow = { pregunta: string; respuesta: string };

const SELECT_PLAN_COMPLETO = {
  id: true,
  tipo: true,
  semanaActual: true,
  totalSemanas: true,
  estado: true,
  createdAt: true,
  sesiones: {
    orderBy: { semana: "asc" as const },
    select: {
      id: true,
      semana: true,
      etapa: true,
      respuestas: true,
      notaCoach: true,
      completadaAt: true,
      compromisos: {
        select: {
          id: true,
          accion: true,
          fechaPrevista: true,
          estado: true,
          resultado: true,
        },
      },
    },
  },
};

export async function obtenerPlanActivo(clienteId: string) {
  return db.planGrow.findFirst({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
    select: SELECT_PLAN_COMPLETO,
  });
}

export async function iniciarPlan(clienteId: string) {
  const existente = await db.planGrow.findFirst({
    where: { clienteId, estado: { not: EstadoPlanGrow.CERRADO } },
    select: { id: true },
  });
  if (existente) {
    throw new ApiError(409, "Ya tenés un plan de desarrollo en curso", "plan_existente");
  }

  const estado = await obtenerEstado(clienteId);
  if (!estado.puedeAgendar) {
    throw new ApiError(
      403,
      "Necesitás tener el programa activo (consentimiento + pago) antes de empezar un plan de desarrollo",
      "programa_no_activo",
    );
  }

  return db.planGrow.create({
    data: {
      clienteId,
      sesiones: { create: { semana: 1, etapa: ETAPA_POR_SEMANA[1] } },
    },
    select: SELECT_PLAN_COMPLETO,
  });
}

async function sesionDelCliente(clienteId: string, sesionId: string) {
  const sesion = await db.sesionGrow.findUnique({
    where: { id: sesionId },
    select: { id: true, semana: true, etapa: true, completadaAt: true, planId: true, plan: { select: { clienteId: true, estado: true } } },
  });
  if (!sesion || sesion.plan.clienteId !== clienteId) {
    throw new ApiError(404, "La sesión no existe", "no_encontrada");
  }
  return sesion;
}

export async function responderSesion(clienteId: string, sesionId: string, respuestas: RespuestaGrow[]) {
  const sesion = await sesionDelCliente(clienteId, sesionId);
  if (sesion.completadaAt) {
    throw new ApiError(409, "Esta sesión ya fue respondida", "ya_respondida");
  }

  return db.$transaction(async (tx) => {
    await tx.sesionGrow.update({
      where: { id: sesionId },
      data: { respuestas, completadaAt: new Date() },
    });

    const siguiente = siguienteEtapa(sesion.etapa);
    if (siguiente) {
      await tx.sesionGrow.create({
        data: { planId: sesion.planId, semana: sesion.semana + 1, etapa: siguiente },
      });
      await tx.planGrow.update({
        where: { id: sesion.planId },
        data: { semanaActual: sesion.semana + 1 },
      });
    }

    return tx.planGrow.findUniqueOrThrow({ where: { id: sesion.planId }, select: SELECT_PLAN_COMPLETO });
  });
}

export async function crearCompromisos(
  clienteId: string,
  datos: { accion: string; fechaPrevista: Date }[],
) {
  if (datos.length !== COMPROMISOS_REQUERIDOS) {
    throw new ApiError(
      400,
      `Tenés que registrar exactamente ${COMPROMISOS_REQUERIDOS} compromisos`,
      "campo_invalido",
    );
  }

  const plan = await db.planGrow.findFirst({
    where: { clienteId, estado: EstadoPlanGrow.ACTIVO },
    select: {
      id: true,
      sesiones: {
        where: { etapa: EtapaGrow.WILL },
        select: { id: true, completadaAt: true, compromisos: { select: { id: true } } },
      },
    },
  });
  const sesionWill = plan?.sesiones[0];
  if (!plan || !sesionWill?.completadaAt) {
    throw new ApiError(409, "Todavía no completaste la etapa de acción (Will)", "etapa_incompleta");
  }
  if (sesionWill.compromisos.length > 0) {
    throw new ApiError(409, "Ya registraste tus compromisos para este plan", "ya_registrados");
  }

  return db.$transaction(async (tx) => {
    await tx.compromisoGrow.createMany({
      data: datos.map((d) => ({ sesionId: sesionWill.id, accion: d.accion, fechaPrevista: d.fechaPrevista })),
    });
    await tx.planGrow.update({ where: { id: plan.id }, data: { estado: EstadoPlanGrow.EN_SEGUIMIENTO } });
    return tx.planGrow.findUniqueOrThrow({ where: { id: plan.id }, select: SELECT_PLAN_COMPLETO });
  });
}

export async function reportarCompromiso(
  clienteId: string,
  compromisoId: string,
  estado: EstadoCompromiso,
  resultado: string | null,
) {
  const compromiso = await db.compromisoGrow.findUnique({
    where: { id: compromisoId },
    select: { id: true, sesion: { select: { planId: true, plan: { select: { clienteId: true } } } } },
  });
  if (!compromiso || compromiso.sesion.plan.clienteId !== clienteId) {
    throw new ApiError(404, "El compromiso no existe", "no_encontrado");
  }

  const planId = compromiso.sesion.planId;

  return db.$transaction(async (tx) => {
    await tx.compromisoGrow.update({ where: { id: compromisoId }, data: { estado, resultado } });

    const pendientes = await tx.compromisoGrow.count({
      where: { estado: EstadoCompromiso.PENDIENTE, sesion: { planId } },
    });
    if (pendientes === 0) {
      await tx.planGrow.update({ where: { id: planId }, data: { estado: EstadoPlanGrow.CERRADO } });
    }

    return tx.planGrow.findUniqueOrThrow({ where: { id: planId }, select: SELECT_PLAN_COMPLETO });
  });
}
