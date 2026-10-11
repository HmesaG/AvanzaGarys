import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { crearEvaluacion } from "@/lib/cliente-queries";
import { textoRequerido } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const cuerpo = await leerJson(request);

    const objetivoPrincipal = textoRequerido(cuerpo.objetivoPrincipal, "objetivoPrincipal", {
      min: 10,
      max: 2000,
    });
    const principalDificultad = textoRequerido(cuerpo.principalDificultad, "principalDificultad", {
      min: 10,
      max: 2000,
    });
    const tiempoObjetivo = textoRequerido(cuerpo.tiempoDeseado ?? cuerpo.tiempoObjetivo, "tiempoDeseado", {
      max: 40,
    });

    const evaluacion = await crearEvaluacion(usuario.clienteId!, {
      objetivoPrincipal,
      principalDificultad,
      tiempoObjetivo,
    });

    return jsonOk({ evaluacion }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
