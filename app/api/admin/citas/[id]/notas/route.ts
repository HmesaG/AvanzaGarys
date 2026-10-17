import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { Rol } from "@/generated/prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    verificarOrigen(request);
    await requireRole(Rol.ADMINISTRADOR, Rol.COACH);
    const { id } = await params;
    const cuerpo = await leerJson(request);

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
