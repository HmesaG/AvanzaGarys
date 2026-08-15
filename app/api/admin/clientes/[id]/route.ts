import { authErrorResponse, requireRole } from "@/lib/server/auth";
import { obtenerClienteDetalle } from "@/lib/server/admin-queries";
import { Rol } from "../../../../../generated/enums";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const { id } = await params;

    // El detalle no se cachea: se abre de a uno y debe reflejar cambios recientes
    // (por ejemplo, un programa recién asignado al aprobar una evaluación).
    const cliente = await obtenerClienteDetalle(session, id);
    if (!cliente) {
      return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return Response.json({ cliente });
  } catch (error) {
    return authErrorResponse(error);
  }
}
