import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { textoOpcional } from "@/lib/validacion";
import { EstadoPago, Rol } from "@/generated/prisma/client";

const ESTADOS_VALIDOS = Object.values(EstadoPago);

/**
 * PATCH: Permite a Administración / Secretaría validar un comprobante (EN_REVISION)
 * o registrar un pago en recepción (PENDIENTE -> PAGADO).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    verificarOrigen(request);
    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);
    const { id } = await params;
    const cuerpo = await leerJson(request);

    const pagoExistente = await db.pago.findUnique({
      where: { id },
      select: { id: true, estado: true, metodo: true },
    });
    if (!pagoExistente) {
      throw new ApiError(404, "Pago no encontrado", "no_encontrado");
    }

    const nuevoEstado =
      typeof cuerpo.estado === "string" && ESTADOS_VALIDOS.includes(cuerpo.estado as EstadoPago)
        ? (cuerpo.estado as EstadoPago)
        : EstadoPago.PAGADO;

    const metodo = textoOpcional(cuerpo.metodo, "metodo", { max: 40 }) ?? pagoExistente.metodo ?? "Transferencia";

    const actualizado = await db.pago.update({
      where: { id },
      data: {
        estado: nuevoEstado,
        metodo,
        fechaPago: nuevoEstado === EstadoPago.PAGADO ? new Date() : null,
      },
      select: {
        id: true,
        monto: true,
        estado: true,
        metodo: true,
        concepto: true,
        fechaPago: true,
        comprobanteUrl: true,
      },
    });

    return jsonOk({
      pago: {
        ...actualizado,
        monto: Number(actualizado.monto),
      },
    });
  } catch (error) {
    return manejarError(error);
  }
}

