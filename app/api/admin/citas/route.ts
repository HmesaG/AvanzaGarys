import { authErrorResponse, requireRole } from "@/lib/server/auth";
import { listarCitas } from "@/lib/server/admin-queries";
import { CACHE_KEYS, getOrSetCache } from "@/lib/server/cache";
import { Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

const TTL_SEGUNDOS = 60;

export async function GET() {
  try {
    const session = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);

    const citas = await getOrSetCache(CACHE_KEYS.citas(session.usuarioId), TTL_SEGUNDOS, () =>
      listarCitas(session),
    );

    return Response.json({ citas });
  } catch (error) {
    return authErrorResponse(error);
  }
}
