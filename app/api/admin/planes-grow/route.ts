import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";
import { listarPlanesGrow } from "@/lib/admin-queries";
import { Rol } from "@/generated/prisma/client";

/** A diferencia de Empresas, Planes GROW SÍ es del Coach — es su seguimiento (filtrado por cartera). */
export async function GET() {
  try {
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    return jsonOk({
      planes: await listarPlanesGrow(usuario.rol === Rol.COACH ? usuario.id : undefined),
    });
  } catch (error) {
    return manejarError(error);
  }
}
