import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import { CACHE_KEYS, invalidateCache } from "@/lib/server/cache";
import {
  ClienteError,
  clienteErrorResponse,
  clienteIdDeSesion,
} from "@/lib/server/cliente-queries";
import { MetodoPago, Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

/** La UI usa los labels capitalizados; la base, el enum en mayúscula. */
const METODO_POR_LABEL: Record<string, MetodoPago> = {
  Tarjeta: MetodoPago.TARJETA,
  Transferencia: MetodoPago.TRANSFERENCIA,
};

const pagoSchema = z.object({
  metodo: z.enum(["Tarjeta", "Transferencia"]),
});

/**
 * Registra el pago del programa asignado (paso 8). Mock de pasarela: no hay
 * cobro real, solo se marca el `Pago` PENDIENTE que creó la aprobación de la
 * evaluación. El monto NO viene del cliente — se respeta el que ya está en la
 * fila, si no cualquiera podría pagar su programa por un peso.
 */
export async function POST(request: Request) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    const session = await requireRole(Rol.CLIENTE);
    const clienteId = await clienteIdDeSesion(session);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const parsed = pagoSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Método de pago inválido" }, { status: 400 });
    }

    // Mismo orden que exige la UI: el pago se habilita recién tras el contrato.
    const consentimiento = await prisma.consentimiento.findUnique({
      where: { clienteId },
      select: { aceptado: true },
    });
    if (!consentimiento?.aceptado) {
      throw new ClienteError(409, "Primero debes aceptar el consentimiento");
    }

    const pendiente = await prisma.pago.findFirst({
      where: { clienteId, estado: "PENDIENTE" },
    });
    if (!pendiente) {
      throw new ClienteError(409, "No tienes pagos pendientes");
    }

    const pago = await prisma.pago.update({
      where: { id: pendiente.id },
      data: {
        metodo: METODO_POR_LABEL[parsed.data.metodo]!,
        estado: "PAGADO",
        fecha: new Date(),
      },
    });

    // Los ingresos del mes salen del dashboard cacheado.
    await invalidateCache(CACHE_KEYS.dashboardPattern);

    return Response.json({
      pago: {
        id: pago.id,
        monto: Number(pago.monto),
        metodo: pago.metodo,
        estado: pago.estado,
        fecha: pago.fecha?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}
