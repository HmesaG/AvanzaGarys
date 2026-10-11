import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError, verificarOrigen } from "@/lib/http";
import { alternarTarea } from "@/lib/cliente-queries";
import { Rol } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const { id } = await params;

    const tarea = await alternarTarea(usuario.clienteId!, id);
    return jsonOk({ tarea });
  } catch (error) {
    return manejarError(error);
  }
}
