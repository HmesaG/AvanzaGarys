import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { responderSesion, type RespuestaGrow } from "@/lib/grow-queries";
import { textoRequerido } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const { id } = await params;
    const cuerpo = await leerJson(request);

    if (!Array.isArray(cuerpo.respuestas)) {
      throw new ApiError(400, 'El campo "respuestas" debe ser una lista', "campo_invalido");
    }

    const respuestas: RespuestaGrow[] = cuerpo.respuestas.map((r: unknown, i: number) => {
      const obj = r as Record<string, unknown>;
      return {
        pregunta: textoRequerido(obj.pregunta, `respuestas[${i}].pregunta`, { max: 500 }),
        respuesta: textoRequerido(obj.respuesta, `respuestas[${i}].respuesta`, { min: 3, max: 2000 }),
      };
    });

    const plan = await responderSesion(usuario.clienteId!, id, respuestas);
    return jsonOk({ plan });
  } catch (error) {
    return manejarError(error);
  }
}
