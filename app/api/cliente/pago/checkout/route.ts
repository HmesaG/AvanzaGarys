import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { procesarCheckoutCliente, type MetodoPagoTipo } from "@/lib/pagos";
import { Rol } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const cuerpo = await leerJson(request);

    const metodo = (cuerpo.metodo as MetodoPagoTipo) || "Tarjeta";
    const detallesTarjeta = cuerpo.detallesTarjeta as { ultimos4: string; titular: string } | undefined;

    const resultado = await procesarCheckoutCliente({
      clienteId: usuario.clienteId!,
      metodo,
      detallesTarjeta,
    });

    return jsonOk({ resultado });
  } catch (error) {
    return manejarError(error);
  }
}
