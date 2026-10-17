import { NextRequest, NextResponse } from "next/server";
import { requireSesion } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { iaClient } from "@/lib/server/ia-client";

export async function POST(request: NextRequest) {
  try {
    const usuario = await requireSesion();
    const cuerpo = await request.json().catch(() => ({}));
    const { clienteId: clienteIdParam, mensajesRecientes } = cuerpo;

    // Determinar el cliente objetivo
    const clienteId = usuario.clienteId || clienteIdParam;
    if (!clienteId) {
      return NextResponse.json(
        { error: "Falta clienteId para contextualizar el coaching" },
        { status: 400 },
      );
    }

    // Obtener contexto del cliente (plan GROW activo y objetivo)
    const cliente = await db.cliente.findUnique({
      where: { id: clienteId },
      include: {
        usuario: true,
        planesGrow: {
          where: { estado: "ACTIVO" },
          include: {
            sesiones: {
              orderBy: { semana: "desc" },
              take: 1,
            },
          },
        },
        evaluaciones: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const planActivo = cliente.planesGrow[0];
    const ultimaSesion = planActivo?.sesiones[0];
    const etapaActual = ultimaSesion?.etapa || "GOAL";
    const objetivo = cliente.evaluaciones[0]?.objetivoPrincipal || "Desarrollo personal y profesional";

    const historialTexto = (mensajesRecientes || [])
      .slice(-6)
      .map((m: { remitente: string; texto: string }) => `${m.remitente}: ${m.texto}`)
      .join("\n");

    const prompt = `
Eres un copiloto de coaching ontológico y ejecutivo experto en el Modelo GROW para la plataforma AvanzA.
Estás asistiendo en una conversación entre el Coach y el Cliente.

INFORMACIÓN DEL CLIENTE:
- Nombre: ${cliente.usuario.nombre}
- Objetivo Principal: ${objetivo}
- Plan GROW: ${planActivo?.tipo || "LIDERAZGO"} (Semana ${planActivo?.semanaActual || 1})
- Etapa GROW Actual: ${etapaActual}

ÚLTIMOS MENSAJES DE LA CONVERSACIÓN:
${historialTexto || "Sin mensajes previos recientes."}

ROL DEL ASISTENTE:
El usuario actual es: ${usuario.rol === "CLIENTE" ? "el CLIENTE que busca cómo expresar su avance o consulta a su Coach" : "el COACH que desea dar una respuesta poderosa, empática y orientada a la acción al cliente"}.

INSTRUCCIÓN:
Genera un mensaje conciso (máximo 3-4 oraciones), empático, motivador y profesional en español.
${
  usuario.rol === "CLIENTE"
    ? "Haz una reflexión honesta sobre el avance de la semana o formula una pregunta clara a tu coach sobre cómo superar un obstáculo."
    : `Formula una pregunta poderosa o un reconocimiento afirmativo alineado a la etapa ${etapaActual} del modelo GROW para invitar a la reflexión y compromiso del coachee.`
}

Responde ÚNICAMENTE con el texto del mensaje sugerido, sin introducciones ni comillas.
    `.trim();

    const resultadoIa = await iaClient.completarPrompt(prompt, {
      temperatura: 0.7,
      maxTokens: 300,
    });

    return NextResponse.json({
      sugerencia: resultadoIa.texto.trim(),
      proveedor: resultadoIa.proveedor,
      etapaGrow: etapaActual,
    });
  } catch (error) {
    console.error("[ia-copiloto] Error generando sugerencia:", error);
    return NextResponse.json(
      { error: "No se pudo generar la sugerencia con IA" },
      { status: 500 },
    );
  }
}
