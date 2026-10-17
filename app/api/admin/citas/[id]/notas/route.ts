import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { jsonOk, leerJson, manejarError, verificarOrigen, ApiError } from "@/lib/http";
import { Rol } from "@/generated/prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH);
    const { id } = await params;
    const cuerpo = await leerJson(request);

    // Verificar existencia previa de la cita
    const citaExistente = await db.cita.findUnique({
      where: { id },
      select: { id: true, coachId: true },
    });
    if (!citaExistente) {
      throw new ApiError(404, "Cita no encontrada", "no_encontrado");
    }

    // Regla de seguridad ICF: Un coach solo puede editar notas de sus propias citas
    if (usuario.rol === Rol.COACH && citaExistente.coachId !== usuario.id) {
      throw new ApiError(
        403,
        "No tienes permiso para modificar las notas de esta cita",
        "sin_permiso",
      );
    }

    const cita = await db.cita.update({
      where: { id },
      data: {
        notas: typeof cuerpo.notas === "string" ? cuerpo.notas : null,
      },
      select: {
        id: true,
        notas: true,
        fecha: true,
        modalidad: true,
        estado: true,
      },
    });

    return jsonOk({ cita });
  } catch (error) {
    return manejarError(error);
  }
}
