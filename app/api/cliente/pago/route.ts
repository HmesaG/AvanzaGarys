import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { registrarPago } from "@/lib/cliente-queries";
import { textoRequerido } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

const METODOS = ["Tarjeta", "Transferencia", "Efectivo"] as const;

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const cuerpo = await leerJson(request);

    // El monto NUNCA se lee del body — ver lib/cliente-queries.ts#registrarPago.
    const metodo = textoRequerido(cuerpo.metodo, "metodo", { max: 40 });
    if (!METODOS.includes(metodo as (typeof METODOS)[number])) {
      throw new ApiError(400, "Método de pago inválido (Tarjeta, Transferencia o Efectivo)", "campo_invalido");
    }

    const pago = await registrarPago(usuario.clienteId!, metodo);
    return jsonOk({ pago });
  } catch (error) {
    return manejarError(error);
  }
}
