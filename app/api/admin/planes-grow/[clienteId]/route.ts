import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { agregarNotaSesion, cambiarEstadoPlan, obtenerPlanGrowDetalle } from "@/lib/admin-queries";
import { textoOpcional, textoRequerido } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

export async function GET(_request: Request, { params }: { params: Promise<{ clienteId: string }> }) {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const { clienteId } = await params;

    const plan = await obtenerPlanGrowDetalle(clienteId);
    if (!plan) {
      throw new ApiError(404, "Este cliente no tiene un plan de desarrollo", "no_encontrado");
    }

    return jsonOk({ plan });
  } catch (error) {
    return manejarError(error);
  }
}

const ESTADOS_ADMIN = ["ACTIVO", "PAUSADO", "CERRADO"] as const;

/**
 * Dos acciones del coach sobre el plan: agregar una nota a una sesión
 * (`sesionId` + `nota`) y/o cambiar el estado del plan (pausar/reactivar/
 * cerrar manualmente). Ninguna pasa por `grow-queries.ts` porque son
 * acciones de staff, no del flujo del cliente.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ clienteId: string }> }) {
  try {
    verificarOrigen(request);
    await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const { clienteId } = await params;
    const cuerpo = await leerJson(request);

    const plan = await obtenerPlanGrowDetalle(clienteId);
    if (!plan) {
      throw new ApiError(404, "Este cliente no tiene un plan de desarrollo", "no_encontrado");
    }

    if (cuerpo.sesionId !== undefined) {
      const sesionId = textoRequerido(cuerpo.sesionId, "sesionId", { max: 40 });
      const nota = textoRequerido(cuerpo.nota, "nota", { max: 1000 });
      if (!plan.sesiones.some((s) => s.id === sesionId)) {
        throw new ApiError(404, "La sesión no pertenece a este plan", "no_encontrada");
      }
      await agregarNotaSesion(sesionId, nota);
    }

    if (cuerpo.estado !== undefined) {
      const estadoTexto = textoOpcional(cuerpo.estado, "estado", { max: 20 })?.toUpperCase();
      if (!ESTADOS_ADMIN.includes(estadoTexto as (typeof ESTADOS_ADMIN)[number])) {
        throw new ApiError(400, "El estado debe ser ACTIVO, PAUSADO o CERRADO", "campo_invalido");
      }
      await cambiarEstadoPlan(plan.id, estadoTexto as (typeof ESTADOS_ADMIN)[number]);
    }

    return jsonOk({ plan: await obtenerPlanGrowDetalle(clienteId) });
  } catch (error) {
    return manejarError(error);
  }
}
