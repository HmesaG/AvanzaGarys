import { authErrorResponse, requireRole } from "@/lib/server/auth";
import { obtenerEvaluacionesPendientes } from "@/lib/server/admin-queries";
import { CACHE_KEYS, getOrSetCache } from "@/lib/server/cache";
import { Rol } from "../../../../../generated/enums";

export const runtime = "nodejs";

const TTL_SEGUNDOS = 30;

export async function GET() {
  try {
    const session = await requireRole(Rol.ADMINISTRADOR, Rol.COACH);

    const evaluaciones = await getOrSetCache(
      CACHE_KEYS.evaluacionesPendientes(session.usuarioId),
      TTL_SEGUNDOS,
      () => obtenerEvaluacionesPendientes(session),
    );

    return Response.json({ evaluaciones });
  } catch (error) {
    return authErrorResponse(error);
  }
}
