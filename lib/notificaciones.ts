import { db } from "./prisma";
import { EstadoCita } from "../generated/prisma/client";

export type PlantillaNotificacion = {
  destinatarioEmail: string;
  destinatarioNombre: string;
  asunto: string;
  cuerpoHtml: string;
  tipo: "RECORDATORIO_CITA" | "EVALUACION_APROBADA" | "ALERTA_COMPROMISO_GROW";
};

/**
 * Genera recordatorios para citas programadas dentro de las próximas 24 horas.
 */
export async function generarRecordatoriosProximasCitas(): Promise<PlantillaNotificacion[]> {
  const ahora = new Date();
  const en24Horas = new Date(ahora.getTime() + 24 * 3600 * 1000);

  const citas = await db.cita.findMany({
    where: {
      fecha: { gte: ahora, lte: en24Horas },
      estado: EstadoCita.CONFIRMADA,
    },
    include: {
      cliente: { include: { usuario: true } },
      coach: true,
    },
  });

  return citas.map((cita) => {
    const fechaHoraStr = new Intl.DateTimeFormat("es-DO", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(cita.fecha));

    return {
      destinatarioEmail: cita.cliente.usuario.email,
      destinatarioNombre: cita.cliente.usuario.nombre,
      asunto: `Recordatorio de tu sesión de coaching: ${fechaHoraStr}`,
      cuerpoHtml: `
        <h2>Hola ${cita.cliente.usuario.nombre},</h2>
        <p>Te recordamos que tu próxima sesión de coaching está agendada para:</p>
        <p><strong>Fecha y hora:</strong> ${fechaHoraStr}</p>
        <p><strong>Modalidad:</strong> ${cita.modalidad}</p>
        ${cita.coach ? `<p><strong>Coach asignado:</strong> ${cita.coach.nombre}</p>` : ""}
        <p>Nos vemos pronto en Avanza.</p>
      `,
      tipo: "RECORDATORIO_CITA",
    };
  });
}

/**
 * Genera notificación de bienvenida y asignación tras la aprobación de evaluación.
 */
export async function generarNotificacionAprobacion(clienteId: string): Promise<PlantillaNotificacion | null> {
  const cliente = await db.cliente.findUnique({
    where: { id: clienteId },
    include: {
      usuario: true,
      programas: { where: { activo: true }, take: 1 },
      coach: true,
    },
  });

  if (!cliente || cliente.programas.length === 0) return null;
  const programa = cliente.programas[0];

  return {
    destinatarioEmail: cliente.usuario.email,
    destinatarioNombre: cliente.usuario.nombre,
    asunto: `¡Tu programa "${programa.nombre}" ha sido aprobado en Avanza!`,
    cuerpoHtml: `
      <h2>¡Felicidades, ${cliente.usuario.nombre}!</h2>
      <p>Tu coach ${cliente.coach ? cliente.coach.nombre : "de Avanza"} ha revisado tu evaluación inicial.</p>
      <p>Tu programa asignado es: <strong>${programa.nombre}</strong></p>
      <p>Ya puedes acceder a la plataforma para aceptar el consentimiento, confirmar tu pago y agendar tu primera sesión.</p>
    `,
    tipo: "EVALUACION_APROBADA",
  };
}
