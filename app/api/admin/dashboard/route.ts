import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";
import { statsDashboard } from "@/lib/admin-queries";
import { Rol } from "@/generated/prisma/client";

export async function GET() {
  try {
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    return jsonOk({
      stats: await statsDashboard(usuario.rol === Rol.COACH ? usuario.id : undefined),
    });
  } catch (error) {
    return manejarError(error);
  }
}
