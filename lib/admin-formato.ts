// Formato y etiquetas compartidas por las vistas del panel administrativo.
//
// Reemplaza a los helpers que vivían en `lib/admin-mock-data.ts`. Los datos ya
// vienen de la API, pero la presentación sigue siendo la misma en las cuatro
// pantallas: moneda DOP, etiquetas en español de los enums de Prisma e
// iniciales para los avatares (la base guarda `nombre`, no iniciales).
//
// Los enums se importan con `import type`: se borran en compilación, así que un
// componente cliente puede tipar contra el schema sin arrastrar Prisma al bundle.
import type { EstadoCita, EstadoPago, LineaAsesoria, Rol } from "@/generated/prisma/client";

/** Las fechas llegan como `Date` en las vistas de servidor y como ISO por JSON. */
type FechaEntrada = string | Date;

function aFecha(valor: FechaEntrada): Date {
  return valor instanceof Date ? valor : new Date(valor);
}

export function formatIngresos(valor: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatMonto(valor: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(valor);
}

/** "2026-09-08T13:00:00Z" -> "8 sept" */
export function formatFechaCorta(valor: FechaEntrada): string {
  return new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short" }).format(
    aFecha(valor),
  );
}

/** "2026-09-08T13:00:00Z" -> "8 de septiembre de 2026" */
export function formatFechaLarga(valor: FechaEntrada): string {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "long" }).format(aFecha(valor));
}

/** "2026-09-08T13:00:00Z" -> "09:00 a. m." (hora local del navegador/servidor) */
export function formatHora(valor: FechaEntrada): string {
  return new Intl.DateTimeFormat("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(aFecha(valor));
}

/** Avatar: "Maria Fernandez" -> "MF". Una sola letra si el nombre es simple. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

/** Saludo del dashboard: se muestra sólo el primer nombre. */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

export const ROL_LABEL: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  COACH: "Coach",
  SECRETARIA: "Secretaría",
  CLIENTE: "Cliente",
};

export const LINEA_LABEL: Record<LineaAsesoria, string> = {
  PERSONAL: "Personal",
  CORPORATIVO: "Corporativo",
  DEPORTIVO: "Deportivo",
};

export const LINEA_BADGE: Record<LineaAsesoria, string> = {
  PERSONAL: "bg-avanza-green-light text-avanza-green-dark",
  CORPORATIVO: "bg-avanza-blue-light text-avanza-blue",
  DEPORTIVO: "bg-avanza-orange-light text-avanza-orange",
};

export const ESTADO_CITA_LABEL: Record<EstadoCita, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  COMPLETADA: "Realizada",
};

export const ESTADO_CITA_BADGE: Record<EstadoCita, string> = {
  PENDIENTE: "bg-avanza-orange-light text-avanza-orange",
  CONFIRMADA: "bg-avanza-green-light text-avanza-green-dark",
  CANCELADA: "bg-red-50 text-red-600",
  COMPLETADA: "bg-gray-200 text-gray-600",
};

/** Punto de color en la grilla del calendario. */
export const ESTADO_CITA_DOT: Record<EstadoCita, string> = {
  PENDIENTE: "bg-avanza-orange",
  CONFIRMADA: "bg-avanza-green",
  CANCELADA: "bg-red-400",
  COMPLETADA: "bg-gray-400",
};

export const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  VENCIDO: "Vencido",
  CANCELADO: "Cancelado",
};

export const ESTADO_PAGO_BADGE: Record<EstadoPago, string> = {
  PENDIENTE: "bg-avanza-orange-light text-avanza-orange",
  PAGADO: "bg-avanza-green-light text-avanza-green-dark",
  VENCIDO: "bg-red-50 text-red-600",
  CANCELADO: "bg-gray-200 text-gray-600",
};
