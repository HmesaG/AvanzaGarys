import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import {
  ClienteError,
  clienteErrorResponse,
  clienteIdDeSesion,
} from "@/lib/server/cliente-queries";
import { Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

/**
 * Acepta el consentimiento/contrato (paso 7). Requiere evaluación APROBADA: el
 * contrato es sobre el programa asignado, así que sin aprobación no hay nada
 * que consentir. La UI ya lo oculta, pero el chequeo real va acá.
 */
export async function POST(request: Request) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    const session = await requireRole(Rol.CLIENTE);
    const clienteId = await clienteIdDeSesion(session);

    const ultima = await prisma.evaluacion.findFirst({
      where: { clienteId },
      orderBy: { createdAt: "desc" },
      select: { estado: true },
    });
    if (ultima?.estado !== "APROBADA") {
      throw new ClienteError(409, "Tu evaluación todavía no fue aprobada");
    }

    const existente = await prisma.consentimiento.findUnique({ where: { clienteId } });
    if (existente?.aceptado) {
      throw new ClienteError(409, "Ya aceptaste el consentimiento");
    }

    const fecha = new Date();
    // `Consentimiento.clienteId` es único: upsert cubre tanto el alta como el
    // caso de una fila creada antes con `aceptado: false`.
    const consentimiento = await prisma.consentimiento.upsert({
      where: { clienteId },
      create: { clienteId, aceptado: true, fecha },
      update: { aceptado: true, fecha },
    });

    return Response.json({
      consentimiento: {
        aceptado: consentimiento.aceptado,
        fecha: consentimiento.fecha.toISOString(),
      },
    });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}
