import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import { CACHE_KEYS, invalidateCache } from "@/lib/server/cache";
import {
  ClienteError,
  clienteErrorResponse,
  clienteIdDeSesion,
} from "@/lib/server/cliente-queries";
import { Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

const evaluacionSchema = z.object({
  objetivoPrincipal: z.string().trim().min(10).max(2000),
  principalDificultad: z.string().trim().min(10).max(2000),
  tiempoDeseado: z.enum(["1_mes", "3_meses", "6_meses", "1_anio", "sin_definir"]),
});

/**
 * Envía la evaluación inicial del cliente en sesión (estado PENDIENTE).
 *
 * Ciclo de estados, derivado de `admin/evaluaciones/[id]/aprobar|rechazar`:
 *   - PENDIENTE -> el coach todavía la está revisando. No se acepta una nueva:
 *     duplicarla dejaría dos filas en la bandeja compartida del coach.
 *   - APROBADA  -> ya tiene programa y pago generados. Reenviar acá arrancaría
 *     un segundo ciclo por su cuenta; eso es decisión del área administrativa.
 *   - RECHAZADA -> el coach pidió explícitamente que la complete de nuevo, así
 *     que sí se permite reenviar (es el camino que ya ofrecía la UI).
 */
export async function POST(request: Request) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    const session = await requireRole(Rol.CLIENTE);
    const clienteId = await clienteIdDeSesion(session);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const parsed = evaluacionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Revisa los datos del formulario" }, { status: 400 });
    }

    const ultima = await prisma.evaluacion.findFirst({
      where: { clienteId },
      orderBy: { createdAt: "desc" },
      select: { estado: true },
    });

    if (ultima?.estado === "PENDIENTE") {
      throw new ClienteError(409, "Ya tienes una evaluación en revisión");
    }
    if (ultima?.estado === "APROBADA") {
      throw new ClienteError(409, "Tu evaluación ya fue aprobada");
    }

    const evaluacion = await prisma.evaluacion.create({
      data: { clienteId, ...parsed.data },
    });

    // La bandeja del coach se sirve cacheada (TTL 60s): sin invalidar, una
    // evaluación recién enviada tardaría hasta un minuto en aparecerle.
    await Promise.all([
      invalidateCache(CACHE_KEYS.dashboardPattern),
      invalidateCache(CACHE_KEYS.evaluacionesPendientesPattern),
    ]);

    return Response.json({ evaluacion: { id: evaluacion.id, estado: evaluacion.estado } }, {
      status: 201,
    });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}
