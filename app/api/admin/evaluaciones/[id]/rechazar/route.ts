import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import { CACHE_KEYS, invalidateCache } from "@/lib/server/cache";
import { Rol } from "../../../../../../generated/enums";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    const session = await requireRole(Rol.ADMINISTRADOR, Rol.COACH);
    const { id } = await params;

    const evaluacion = await prisma.evaluacion.findUnique({ where: { id } });
    if (!evaluacion) {
      return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
    }
    if (evaluacion.estado !== "PENDIENTE") {
      return Response.json({ error: "La evaluación ya fue revisada" }, { status: 409 });
    }

    await prisma.evaluacion.update({
      where: { id },
      data: { estado: "RECHAZADA", revisadaPorId: session.usuarioId },
    });

    await Promise.all([
      invalidateCache(CACHE_KEYS.dashboardPattern),
      invalidateCache(CACHE_KEYS.evaluacionesPendientesPattern),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
