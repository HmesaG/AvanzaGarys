import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError, verificarOrigen } from "@/lib/http";
import { cancelarCitaCliente } from "@/lib/cliente-queries";
import { Rol } from "@/generated/prisma/client";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const { id } = await params;

    const cita = await cancelarCitaCliente(usuario.clienteId!, id);
    return jsonOk({ cita });
  } catch (error) {
    return manejarError(error);
  }
}
