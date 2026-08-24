import { authErrorResponse, requireRole } from "@/lib/server/auth";
import { obtenerEmpresaDetalle } from "@/lib/server/admin-queries";
import { Rol } from "../../../../../generated/enums";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);
    const { id } = await params;

    const empresa = await obtenerEmpresaDetalle(id);
    if (!empresa) {
      return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    return Response.json({ empresa });
  } catch (error) {
    return authErrorResponse(error);
  }
}
