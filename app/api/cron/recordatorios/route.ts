import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { enviarEmail } from "@/lib/email";
import { EstadoCompromiso, EstadoCita } from "@/generated/prisma/client";

export async function POST() {
  try {
    const ahora = new Date();
    const en48Horas = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);

    // 1. Compromisos GROW próximos a vencer
    const compromisosProximos = await db.compromisoGrow.findMany({
      where: {
        estado: EstadoCompromiso.PENDIENTE,
        fechaPrevista: {
          gte: ahora,
          lte: en48Horas,
        },
      },
      include: {
        sesion: {
          include: {
            plan: {
              include: {
                cliente: {
                  include: {
                    usuario: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const enviosCompromisos = [];
    for (const c of compromisosProximos) {
      const usuario = c.sesion.plan.cliente.usuario;
      const msRestantes = c.fechaPrevista.getTime() - ahora.getTime();
      const diasRestantes = Math.max(1, Math.ceil(msRestantes / (1000 * 60 * 60 * 24)));

      const resultado = await enviarEmail({
        destinatario: usuario.email,
        nombreDestinatario: usuario.nombre,
        asunto: `Recordatorio: Compromiso GROW próximo a vencer (${diasRestantes} días)`,
        plantilla: "RECORDATORIO_COMPROMISO_GROW",
        datos: {
          accion: c.accion,
          fechaLimite: c.fechaPrevista.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          diasRestantes,
        },
      });

      enviosCompromisos.push({
        compromisoId: c.id,
        email: usuario.email,
        idMensaje: resultado.idMensaje,
      });
    }

    // 2. Citas próximas (próximas 24 horas)
    const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const citasProximas = await db.cita.findMany({
      where: {
        estado: EstadoCita.CONFIRMADA,
        fecha: {
          gte: ahora,
          lte: en24Horas,
        },
      },
      include: {
        cliente: {
          include: {
            usuario: true,
          },
        },
        coach: true,
      },
    });

    const enviosCitas = [];
    for (const cita of citasProximas) {
      const usuario = cita.cliente.usuario;
      const enlaceVirtual =
        cita.modalidad === "Virtual"
          ? `https://meet.jit.si/Avanza-Coaching-${cita.id}`
          : "";

      const resultado = await enviarEmail({
        destinatario: usuario.email,
        nombreDestinatario: usuario.nombre,
        asunto: `Tu sesión de coaching es mañana: ${cita.fecha.toLocaleDateString("es-ES")}`,
        plantilla: "CONFIRMACION_CITA",
        datos: {
          fecha: cita.fecha.toLocaleString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          modalidad: cita.modalidad,
          coach: cita.coach?.nombre || "Coach AvanzA",
          enlaceVirtual,
        },
      });

      enviosCitas.push({
        citaId: cita.id,
        email: usuario.email,
        idMensaje: resultado.idMensaje,
      });
    }

    return NextResponse.json({
      exito: true,
      timestamp: ahora.toISOString(),
      resumen: {
        compromisosNotificados: enviosCompromisos.length,
        citasNotificadas: enviosCitas.length,
      },
      detalles: {
        enviosCompromisos,
        enviosCitas,
      },
    });
  } catch (error) {
    console.error("[cron/recordatorios] Error ejecutando recordatorios:", error);
    return NextResponse.json(
      { error: "Error interno al procesar recordatorios" },
      { status: 500 },
    );
  }
}
