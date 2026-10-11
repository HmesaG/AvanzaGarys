import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";
import { listarPlanesGrow } from "@/lib/admin-queries";
import { Rol } from "@/generated/prisma/client";

/** A diferencia de Empresas, Planes GROW SÍ es del Coach — es su seguimiento. */
export async function GET() {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    return jsonOk({ planes: await listarPlanesGrow() });
  } catch (error) {
    return manejarError(error);
  }
}
