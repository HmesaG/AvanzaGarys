import { NextRequest, NextResponse } from "next/server";
import { validarFirmaWebhook, confirmarPagoPorWebhook } from "@/lib/pagos";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature") || request.headers.get("stripe-signature");
    const secret = process.env.PAYMENTS_WEBHOOK_SECRET || "dev_secret_avanza_webhook";

    // Validar firma si estamos en producción
    if (process.env.NODE_ENV === "production") {
      const esValido = validarFirmaWebhook(rawBody, signature, secret);
      if (!esValido) {
        return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
      }
    }

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { evento, pagoId, metadata } = payload;

    if (evento === "payment.succeeded" || evento === "checkout.session.completed") {
      if (!pagoId) {
        return NextResponse.json({ error: "Falta pagoId" }, { status: 400 });
      }
      await confirmarPagoPorWebhook(pagoId, metadata);
      return NextResponse.json({ recibido: true, procesado: true });
    }

    return NextResponse.json({ recibido: true, ignorado: true });
  } catch (error) {
    console.error("Error en webhook de pagos:", error);
    return NextResponse.json({ error: "Error interno procesando evento" }, { status: 500 });
  }
}
