import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { reportarCompromiso } from "@/lib/grow-queries";
import { textoOpcional } from "@/lib/validacion";
import { EstadoCompromiso, Rol } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const { id } = await params;
    const cuerpo = await leerJson(request);

    const estadoTexto = textoOpcional(cuerpo.estado, "estado", { max: 20 })?.toUpperCase();
    if (estadoTexto !== EstadoCompromiso.CUMPLIDO && estadoTexto !== EstadoCompromiso.NO_CUMPLIDO) {
      throw new ApiError(400, "El estado debe ser CUMPLIDO o NO_CUMPLIDO", "campo_invalido");
    }
    const resultado = textoOpcional(cuerpo.resultado, "resultado", { max: 1000 });

    const plan = await reportarCompromiso(usuario.clienteId!, id, estadoTexto, resultado);
    return jsonOk({ plan });
  } catch (error) {
    return manejarError(error);
  }
}
