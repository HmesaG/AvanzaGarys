import { authErrorResponse, requireRole } from "@/lib/server/auth";
import {
  listarCitas,
  obtenerDashboardStats,
  obtenerEvaluacionesPendientes,
} from "@/lib/server/admin-queries";
import { CACHE_KEYS, getOrSetCache } from "@/lib/server/cache";
import { Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

/** TTL corto: el dashboard tolera 30s de desfase, pero cada mutación lo invalida igual. */
const TTL_SEGUNDOS = 30;

export async function GET() {
  try {
    const session = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);

    const data = await getOrSetCache(
      CACHE_KEYS.dashboard(session.rol, session.usuarioId),
      TTL_SEGUNDOS,
      async () => {
        const [stats, evaluacionesPendientes, citas] = await Promise.all([
          obtenerDashboardStats(session),
          obtenerEvaluacionesPendientes(session),
          listarCitas(session),
        ]);

        // "Próximas citas" del dashboard: las 4 más cercanas de hoy en adelante.
        const hoyIso = new Date().toISOString().slice(0, 10);
        const proximasCitas = citas.filter((c) => c.fecha >= hoyIso).slice(0, 4);

        return { stats, evaluacionesPendientes, proximasCitas };
      },
    );

    return Response.json(data);
  } catch (error) {
    return authErrorResponse(error);
  }
}
