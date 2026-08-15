import { authErrorResponse, requireRole } from "@/lib/server/auth";
import { listarClientes } from "@/lib/server/admin-queries";
import { CACHE_KEYS, getOrSetCache } from "@/lib/server/cache";
import { Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

const TTL_SEGUNDOS = 60;

export async function GET() {
  try {
    const session = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);

    const clientes = await getOrSetCache(
      CACHE_KEYS.clientes(session.usuarioId),
      TTL_SEGUNDOS,
      () => listarClientes(session),
    );

    return Response.json({ clientes });
  } catch (error) {
    return authErrorResponse(error);
  }
}
