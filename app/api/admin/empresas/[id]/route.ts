import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, manejarError } from "@/lib/http";
import { obtenerEmpresaDetalle } from "@/lib/admin-queries";
import { Rol } from "@/generated/prisma/client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);
    const { id } = await params;

    const empresa = await obtenerEmpresaDetalle(id);
    if (!empresa) {
      throw new ApiError(404, "La empresa no existe", "no_encontrado");
    }

    return jsonOk({ empresa });
  } catch (error) {
    return manejarError(error);
  }
}
