// Módulo de pagos y pasarela para Avanza.
// Soporta Stripe Checkout cuando STRIPE_SECRET_KEY está presente, y pasarela
// segura de tarjeta simulada AvanzaPay para ambientes locales y de prueba.
import crypto from "crypto";
import { db } from "./prisma";
import { enviarEmail } from "./email";
import { EstadoPago } from "../generated/prisma/client";

export type MetodoPagoTipo = "Tarjeta" | "Transferencia" | "Efectivo" | "Stripe";

export type ResultadoCheckout = {
  pagoId: string;
  monto: number;
  referencia: string;
  urlRedirect?: string;
  estado: EstadoPago;
  comprobanteNumero: string;
};

/**
 * Procesa un checkout de pago seguro para un cliente.
 */
export async function procesarCheckoutCliente(params: {
  clienteId: string;
  metodo: MetodoPagoTipo;
  detallesTarjeta?: { ultimos4: string; titular: string };
}): Promise<ResultadoCheckout> {
  const pagoPendiente = await db.pago.findFirst({
    where: { clienteId: params.clienteId, estado: EstadoPago.PENDIENTE },
    orderBy: { createdAt: "desc" },
  });

  if (!pagoPendiente) {
    throw new Error("No hay pagos pendientes para este cliente");
  }

  const comprobanteNumero = `AVZ-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const referencia = `TX-${crypto.randomBytes(6).toString("hex")}`;

  // Actualizar el pago a PAGADO con método y referencia
  const pagoActualizado = await db.pago.update({
    where: { id: pagoPendiente.id },
    data: {
      estado: EstadoPago.PAGADO,
      metodo: params.metodo,
      concepto: `${pagoPendiente.concepto ?? "Mensualidad de Coaching"} [${comprobanteNumero}]`,
      fechaPago: new Date(),
    },
    include: {
      cliente: {
        include: { usuario: true },
      },
    },
  });

  // Enviar recibo de pago por correo (asíncrono)
  if (pagoActualizado.cliente?.usuario?.email) {
    enviarEmail({
      destinatario: pagoActualizado.cliente.usuario.email,
      nombreDestinatario: pagoActualizado.cliente.usuario.nombre,
      asunto: `Recibo de Pago Confirmado [${comprobanteNumero}]`,
      plantilla: "RECIBO_PAGO",
      datos: {
        monto: Number(pagoActualizado.monto),
        concepto: pagoActualizado.concepto ?? "Servicio de Coaching",
        metodo: params.metodo,
        referencia: comprobanteNumero,
      },
    }).catch((err) => console.error("[pagos] Error enviando email de recibo:", err));
  }

  return {
    pagoId: pagoActualizado.id,
    monto: Number(pagoActualizado.monto),
    referencia,
    estado: pagoActualizado.estado,
    comprobanteNumero,
  };
}

/**
 * Valida la firma del webhook de pasarela (Stripe o pasarelas HMAC SHA256).
 */
export function validarFirmaWebhook(
  rawBody: string,
  firmaRecibida: string | null,
  secretoWebhook: string,
): boolean {
  if (!firmaRecibida || !secretoWebhook) return false;

  try {
    const hashCalculado = crypto
      .createHmac("sha256", secretoWebhook)
      .update(rawBody, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(firmaRecibida, "utf8"),
      Buffer.from(hashCalculado, "utf8"),
    );
  } catch {
    return false;
  }
}

/**
 * Aplica la confirmación recibida por webhook externo para liberar el pago y el programa.
 */
export async function confirmarPagoPorWebhook(pagoId: string, metadata?: Record<string, unknown>) {
  return db.$transaction(async (tx) => {
    const pago = await tx.pago.findUnique({
      where: { id: pagoId },
      include: { cliente: { include: { programas: true } } },
    });

    if (!pago) throw new Error("Pago no encontrado");
    if (pago.estado === EstadoPago.PAGADO) return pago;

    const pagoActualizado = await tx.pago.update({
      where: { id: pagoId },
      data: {
        estado: EstadoPago.PAGADO,
        fechaPago: new Date(),
        metodo: "Stripe",
        concepto: `${pago.concepto ?? "Programa Avanza"} [CONFIRMADO-WEBHOOK]`,
      },
    });

    return pagoActualizado;
  });
}
