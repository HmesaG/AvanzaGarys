/**
 * Utilidades para generación de enlaces y archivos de calendario (.ics, Google, Outlook)
 * Cumple con el estándar iCalendar RFC 5545.
 */

export type EventoCalendario = {
  id: string;
  titulo: string;
  descripcion: string;
  ubicacion?: string;
  fechaInicio: Date;
  duracionMinutos?: number;
};

function formatoFechaIcs(fecha: Date): string {
  return fecha.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Genera el contenido de un archivo .ics estándar RFC 5545
 */
export function generarIcs(evento: EventoCalendario): string {
  const duracion = evento.duracionMinutos ?? 60;
  const fechaFin = new Date(evento.fechaInicio.getTime() + duracion * 60 * 1000);

  const startFormatted = formatoFechaIcs(evento.fechaInicio);
  const endFormatted = formatoFechaIcs(fechaFin);
  const stampFormatted = formatoFechaIcs(new Date());

  const descripcionLimpia = (evento.descripcion || "")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

  const ubicacionLimpia = (evento.ubicacion || "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AvanzA Coaching//Plataforma GROW//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:cita-${evento.id}@avanza.do`,
    `DTSTAMP:${stampFormatted}`,
    `DTSTART:${startFormatted}`,
    `DTEND:${endFormatted}`,
    `SUMMARY:${evento.titulo}`,
    `DESCRIPTION:${descripcionLimpia}`,
    ubicacionLimpia ? `LOCATION:${ubicacionLimpia}` : "",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio de sesión AvanzA",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/**
 * Genera enlace para agregar el evento directamente a Google Calendar web
 */
export function generarEnlaceGoogleCalendar(evento: EventoCalendario): string {
  const duracion = evento.duracionMinutos ?? 60;
  const fechaFin = new Date(evento.fechaInicio.getTime() + duracion * 60 * 1000);

  const start = formatoFechaIcs(evento.fechaInicio);
  const end = formatoFechaIcs(fechaFin);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: evento.titulo,
    dates: `${start}/${end}`,
    details: evento.descripcion,
    location: evento.ubicacion || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genera enlace para agregar a Outlook Live / Office 365 web
 */
export function generarEnlaceOutlook(evento: EventoCalendario): string {
  const duracion = evento.duracionMinutos ?? 60;
  const fechaFin = new Date(evento.fechaInicio.getTime() + duracion * 60 * 1000);

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: evento.titulo,
    body: evento.descripcion,
    startdt: evento.fechaInicio.toISOString(),
    enddt: fechaFin.toISOString(),
    location: evento.ubicacion || "",
  });

  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}
