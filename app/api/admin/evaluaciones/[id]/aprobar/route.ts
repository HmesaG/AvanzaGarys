import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import { CACHE_KEYS, invalidateCache } from "@/lib/server/cache";
import { Rol } from "../../../../../../generated/enums";

export const runtime = "nodejs";

const aprobarSchema = z.object({
  programaId: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    const session = await requireRole(Rol.ADMINISTRADOR, Rol.COACH);
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const parsed = aprobarSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Falta el programa a asignar" }, { status: 400 });
    }

    const evaluacion = await prisma.evaluacion.findUnique({ where: { id } });
    if (!evaluacion) {
      return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
    }
    if (evaluacion.estado !== "PENDIENTE") {
      return Response.json({ error: "La evaluación ya fue revisada" }, { status: 409 });
    }

    const programa = await prisma.programa.findUnique({ where: { id: parsed.data.programaId } });
    if (!programa) {
      return Response.json({ error: "Programa no encontrado" }, { status: 404 });
    }

    // Los tres escritos van en una transacción: aprobar sin asignar programa o
    // sin generar el pago dejaría al cliente en un estado inconsistente.
    await prisma.$transaction([
      prisma.evaluacion.update({
        where: { id },
        data: { estado: "APROBADA", revisadaPorId: session.usuarioId },
      }),
      prisma.programaAsignado.create({
        data: {
          clienteId: evaluacion.clienteId,
          programaId: programa.id,
          evaluacionId: evaluacion.id,
        },
      }),
      prisma.pago.create({
        data: {
          clienteId: evaluacion.clienteId,
          monto: programa.precio,
          metodo: "TRANSFERENCIA",
          estado: "PENDIENTE",
        },
      }),
    ]);

    await Promise.all([
      invalidateCache(CACHE_KEYS.dashboardPattern),
      invalidateCache(CACHE_KEYS.evaluacionesPendientesPattern),
      invalidateCache(CACHE_KEYS.clientesPattern),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
