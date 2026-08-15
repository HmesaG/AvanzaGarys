"use client";

// Cliente HTTP del área privada — Fase 3a Entrega 2.
//
// Reemplaza a `lib/client-state.ts` (estado en localStorage): ahora todo el
// estado del cliente vive en MariaDB y se lee/escribe por `/api/cliente/*`.
// Los tipos replican las formas que devuelve `lib/server/cliente-queries.ts`.

export type TipoAsesoriaApi = "PERSONAL" | "CORPORATIVO" | "DEPORTIVO";
export type EstadoEvaluacionApi = "PENDIENTE" | "APROBADA" | "RECHAZADA";
export type MetodoPagoLabel = "Tarjeta" | "Transferencia";
export type ModalidadLabel = "Virtual" | "Presencial";

export type PerfilCliente = {
  id: string;
  nombreCompleto: string;
  telefono: string;
  correo: string;
  edad: number;
  tipoAsesoria: TipoAsesoriaApi;
};

export type EvaluacionCliente = {
  id: string;
  objetivoPrincipal: string;
  principalDificultad: string;
  tiempoDeseado: string;
  estado: EstadoEvaluacionApi;
};

export type ProgramaCliente = {
  id: string;
  nombre: string;
  descripcion: string;
  sesionesIncluidas: number;
  precio: number;
};

export type ConsentimientoCliente = {
  aceptado: boolean;
  fecha: string;
};

export type PagoCliente = {
  id: string;
  monto: number;
  metodo: "TARJETA" | "TRANSFERENCIA";
  estado: "PENDIENTE" | "PAGADO";
  fecha: string | null;
};

export type CitaCliente = {
  id: string;
  /** ISO corto: `2026-08-15`. */
  fecha: string;
  hora: string;
  modalidad: ModalidadLabel;
  estado: "confirmada" | "pendiente";
};

export type MensajeCliente = {
  id: string;
  de: "cliente" | "asesor";
  texto: string;
  /** ISO completo; se formatea en el navegador. */
  hora: string;
};

export type EstadoCliente = {
  perfil: PerfilCliente;
  evaluacion: EvaluacionCliente | null;
  programaAsignado: ProgramaCliente | null;
  consentimiento: ConsentimientoCliente | null;
  pago: PagoCliente | null;
  proximaCita: CitaCliente | null;
  puedeAgendar: boolean;
};

// --- Transporte ---------------------------------------------------------------

/** Error con el mensaje que devolvió la API (o uno genérico si no vino ninguno). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
  });

  if (!res.ok) {
    let mensaje = "No se pudo completar la operación";
    try {
      const cuerpo = (await res.json()) as { error?: string };
      if (cuerpo.error) mensaje = cuerpo.error;
    } catch {
      // Respuesta sin JSON (500 de infraestructura, por ejemplo).
    }
    throw new ApiError(res.status, mensaje);
  }

  return (await res.json()) as T;
}

function postJson<T>(url: string, body: unknown): Promise<T> {
  return pedir<T>(url, { method: "POST", body: JSON.stringify(body) });
}

// --- Endpoints ----------------------------------------------------------------

export async function registrarCliente(datos: {
  nombreCompleto: string;
  telefono: string;
  correo: string;
  edad: string;
  tipoAsesoria: string;
  password: string;
}): Promise<void> {
  await postJson("/api/auth/registro", datos);
}

export async function obtenerEstado(): Promise<EstadoCliente> {
  const { estado } = await pedir<{ estado: EstadoCliente }>("/api/cliente/estado");
  return estado;
}

export async function obtenerPerfil(): Promise<PerfilCliente> {
  const { perfil } = await pedir<{ perfil: PerfilCliente }>("/api/cliente/perfil");
  return perfil;
}

export async function actualizarPerfil(datos: {
  telefono?: string;
  correo?: string;
}): Promise<PerfilCliente> {
  const { perfil } = await pedir<{ perfil: PerfilCliente }>("/api/cliente/perfil", {
    method: "PATCH",
    body: JSON.stringify(datos),
  });
  return perfil;
}

export async function enviarEvaluacion(datos: {
  objetivoPrincipal: string;
  principalDificultad: string;
  tiempoDeseado: string;
}): Promise<void> {
  await postJson("/api/cliente/evaluacion", datos);
}

export async function aceptarConsentimiento(): Promise<void> {
  await postJson("/api/cliente/consentimiento", {});
}

export async function registrarPago(metodo: MetodoPagoLabel): Promise<void> {
  await postJson("/api/cliente/pago", { metodo });
}

export async function obtenerCitas(): Promise<{ citas: CitaCliente[]; puedeAgendar: boolean }> {
  return pedir<{ citas: CitaCliente[]; puedeAgendar: boolean }>("/api/cliente/citas");
}

export async function agendarCita(datos: {
  fecha: string;
  hora: string;
  modalidad: ModalidadLabel;
}): Promise<CitaCliente> {
  const { cita } = await postJson<{ cita: CitaCliente }>("/api/cliente/citas", datos);
  return cita;
}

export async function cancelarCita(id: string): Promise<void> {
  await pedir(`/api/cliente/citas/${id}`, { method: "DELETE" });
}

export async function obtenerMensajes(): Promise<MensajeCliente[]> {
  const { mensajes } = await pedir<{ mensajes: MensajeCliente[] }>("/api/cliente/mensajes");
  return mensajes;
}

export async function enviarMensaje(texto: string): Promise<MensajeCliente> {
  const { mensaje } = await postJson<{ mensaje: MensajeCliente }>("/api/cliente/mensajes", {
    texto,
  });
  return mensaje;
}

// --- Presentación -------------------------------------------------------------

const LABEL_POR_TIPO: Record<TipoAsesoriaApi, string> = {
  PERSONAL: "Avanza Personal",
  CORPORATIVO: "Avanza Corporativo",
  DEPORTIVO: "Avanza Deportivo",
};

export function tipoAsesoriaLabel(tipo: TipoAsesoriaApi | undefined): string {
  return tipo ? LABEL_POR_TIPO[tipo] : "Avanza";
}

const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * `2026-08-15` -> `Sábado 15 de agosto` (o `Hoy 15 de agosto`).
 *
 * La fecha se arma componente a componente en hora local: `new Date("2026-08-15")`
 * la interpreta como medianoche UTC y en zonas negativas (RD, UTC-4) mostraría
 * el día anterior.
 */
export function fechaLabel(iso: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  const esHoy =
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear();

  const nombreDia = DIAS_LARGO[fecha.getDay()];
  const prefijo = esHoy ? "Hoy" : nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
  return `${prefijo} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

/** ISO completo -> `10:32 AM`, mismo formato que mostraba el hilo mock. */
export function horaLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-DO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
