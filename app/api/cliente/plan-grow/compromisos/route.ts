import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { crearCompromisos } from "@/lib/grow-queries";
import { fechaValida, textoRequerido } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const cuerpo = await leerJson(request);

    if (!Array.isArray(cuerpo.compromisos)) {
      throw new ApiError(400, 'El campo "compromisos" debe ser una lista', "campo_invalido");
    }

    const datos = cuerpo.compromisos.map((c: unknown, i: number) => {
      const obj = c as Record<string, unknown>;
      return {
        accion: textoRequerido(obj.accion, `compromisos[${i}].accion`, { min: 5, max: 1000 }),
        fechaPrevista: fechaValida(obj.fechaPrevista, `compromisos[${i}].fechaPrevista`),
      };
    });

    const plan = await crearCompromisos(usuario.clienteId!, datos);
    return jsonOk({ plan }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
