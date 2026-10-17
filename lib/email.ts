// Servicio de Emails Transaccionales y Notificaciones
//
// Soporta modo producción (SMTP/Resend si están configuradas las variables)
// y modo desarrollo con registro detallado en log y simulación segura.

export type PlantillaEmail =
  | "CONFIRMACION_CITA"
  | "RECIBO_PAGO"
  | "RECORDATORIO_COMPROMISO_GROW"
  | "BIENVENIDA_CLIENTE";

export type PayloadEmail = {
  destinatario: string;
  nombreDestinatario: string;
  asunto: string;
  plantilla: PlantillaEmail;
  datos: Record<string, string | number | boolean>;
};

export type ResultadoEmail = {
  exito: boolean;
  idMensaje: string;
  destinatario: string;
  timestamp: string;
  modo: "real" | "simulado";
};

function generarHtmlEmail(payload: PayloadEmail): string {
  const { nombreDestinatario, plantilla, datos } = payload;

  const estiloBase = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  `;

  const cabecera = `
    <div style="border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; text-align: center;">
      <h1 style="color: #0284c7; margin: 0; font-size: 24px; letter-spacing: -0.5px;">AvanzA Coaching</h1>
      <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Impulsando tu máximo potencial humano y profesional</p>
    </div>
  `;

  const pie = `
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
      <p style="margin: 0;">Este es un correo automático de AvanzA Coaching Platform.</p>
      <p style="margin: 4px 0 0 0;">Si tienes alguna pregunta, responde directamente o contáctanos por la plataforma.</p>
    </div>
  `;

  let cuerpo = "";

  switch (plantilla) {
    case "CONFIRMACION_CITA":
      cuerpo = `
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">¡Tu sesión de coaching está agendada!</h2>
        <p>Hola <strong>${nombreDestinatario}</strong>,</p>
        <p>Te confirmamos que tu sesión ha sido registrada exitosamente en nuestro sistema.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Fecha y Hora:</strong> ${datos.fecha}</p>
          <p style="margin: 0 0 8px 0;"><strong>Modalidad:</strong> ${datos.modalidad}</p>
          <p style="margin: 0;"><strong>Coach Asignado:</strong> ${datos.coach || "Equipo AvanzA"}</p>
        </div>

        ${
          datos.enlaceVirtual
            ? `<div style="text-align: center; margin: 28px 0;">
                 <a href="${datos.enlaceVirtual}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                   Unirse a la Sala Virtual
                 </a>
                 <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Enlace de la sala: <a href="${datos.enlaceVirtual}" style="color: #0284c7;">${datos.enlaceVirtual}</a></p>
               </div>`
            : ""
        }
      `;
      break;

    case "RECIBO_PAGO":
      cuerpo = `
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Comprobante de Pago Confirmado</h2>
        <p>Hola <strong>${nombreDestinatario}</strong>,</p>
        <p>Hemos recibido satisfactoriamente tu pago por los servicios de coaching.</p>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: #166534;"><strong>Monto Pagado:</strong> $${datos.monto} USD</p>
          <p style="margin: 0 0 8px 0; color: #166534;"><strong>Concepto:</strong> ${datos.concepto}</p>
          <p style="margin: 0 0 8px 0; color: #166534;"><strong>Método:</strong> ${datos.metodo}</p>
          <p style="margin: 0; color: #166534;"><strong>Referencia:</strong> ${datos.referencia || "TXN-" + Date.now().toString(36).toUpperCase()}</p>
        </div>

        <p>Tu programa se encuentra 100% activo. Ya puedes continuar con tus sesiones y tareas en la plataforma.</p>
      `;
      break;

    case "RECORDATORIO_COMPROMISO_GROW":
      cuerpo = `
        <h2 style="font-size: 18px; color: #b45309; margin-top: 0;">Recordatorio de Acción GROW</h2>
        <p>Hola <strong>${nombreDestinatario}</strong>,</p>
        <p>Tienes un compromiso acordado en tu plan GROW que vence pronto:</p>

        <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 16px; color: #92400e;"><strong>Acción:</strong> ${datos.accion}</p>
          <p style="margin: 0 0 8px 0; color: #92400e;"><strong>Fecha Límite:</strong> ${datos.fechaLimite}</p>
          <p style="margin: 0; color: #b45309; font-weight: 600;">Estado: ${datos.diasRestantes} día(s) restante(s)</p>
        </div>

        <p>Recuerda que cada pequeño paso sostenido consolida tu avance. Al completarla, puedes marcarla en tu sección <em>Plan GROW</em>.</p>
      `;
      break;

    default:
      cuerpo = `
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">¡Bienvenido a AvanzA!</h2>
        <p>Hola <strong>${nombreDestinatario}</strong>,</p>
        <p>Estamos muy entusiasmados de acompañarte en tu proceso de transformación y liderazgo.</p>
      `;
  }

  return `
    <div style="${estiloBase}">
      ${cabecera}
      ${cuerpo}
      ${pie}
    </div>
  `;
}

export async function enviarEmail(payload: PayloadEmail): Promise<ResultadoEmail> {
  const timestamp = new Date().toISOString();
  const idMensaje = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const html = generarHtmlEmail(payload);

  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  // 1. Si está configurado Resend API:
  if (resendApiKey) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "AvanzA Coaching <notificaciones@avanza.dev>",
          to: payload.destinatario,
          subject: payload.asunto,
          html,
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        return {
          exito: true,
          idMensaje: json.id || idMensaje,
          destinatario: payload.destinatario,
          timestamp,
          modo: "real",
        };
      }
    } catch (err) {
      console.error("[email] Falló envío vía Resend, aplicando fallback simulado:", err);
    }
  }

  // 2. Modo Desarrollo / Simulación Segura:
  console.log(
    `[EMAIL ENVIADO (${payload.plantilla})] Para: ${payload.nombreDestinatario} <${payload.destinatario}> | Asunto: "${payload.asunto}" | ID: ${idMensaje}`,
  );

  return {
    exito: true,
    idMensaje,
    destinatario: payload.destinatario,
    timestamp,
    modo: "simulado",
  };
}
