"use client";

// Wrapper fetch tipado para las páginas de cliente — reemplaza a
// lib/client-state.ts (localStorage). Mismo rol que lib/admin-queries.ts
// cumple del lado servidor para el panel admin.

export class ApiFetchError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly codigo: string = "error",
  ) {
    super(message);
    this.name = "ApiFetchError";
  }
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new ApiFetchError(
      respuesta.status,
      cuerpo?.error ?? "Ocurrió un error inesperado",
      cuerpo?.codigo ?? "error",
    );
  }

  return cuerpo as T;
}

function post<T>(url: string, data?: unknown) {
  return pedir<T>(url, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined });
}

function patch<T>(url: string, data?: unknown) {
  return pedir<T>(url, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined });
}

// --- Tipos (reflejan la forma de lib/cliente-queries.ts#obtenerEstado) -----

export type EstadoEvaluacion = {
  id: string;
  objetivoPrincipal: string;
  principalDificultad: string;
  tiempoObjetivo: string;
  estado: "PENDIENTE" | "REVISADA";
  createdAt: string;
};

export type EstadoPrograma = {
  id: string;
  nombre: string;
  descripcion: string | null;
  progreso: number;
  activo: boolean;
  consentimientoAceptado: boolean;
  consentimientoAt: string | null;
  monto: number | null;
};

export type EstadoPago = {
  id: string;
  monto: number;
  estado: "PENDIENTE" | "PAGADO" | "VENCIDO" | "CANCELADO";
  metodo: string | null;
  concepto: string | null;
  fechaPago: string | null;
  comprobanteUrl?: string | null;
};

export type EstadoTarea = { id: string; label: string; completada: boolean };

export type EstadoCliente = {
  linea: "PERSONAL" | "CORPORATIVO" | "DEPORTIVO";
  requiereDiagnostico: boolean;
  diagnosticoCompletado: boolean;
  requiereDiagnosticoDeportivo?: boolean;
  diagnosticoDeportivoCompletado?: boolean;
  evaluacion: EstadoEvaluacion | null;
  programa: EstadoPrograma | null;
  pago: EstadoPago | null;
  proximaCita: { id: string; fecha: string; modalidad: string; estado: string; enlaceReunion?: string | null } | null;
  tareas: EstadoTarea[];
  progreso: { completadas: number; total: number; porcentaje: number };
  puedeAgendar: boolean;
};

export function obtenerEstado() {
  return pedir<{ estado: EstadoCliente }>("/api/cliente/estado").then((r) => r.estado);
}

// --- Registro / perfil -------------------------------------------------------

export type DatosRegistro = {
  nombreCompleto: string;
  telefono: string;
  correo: string;
  password: string;
  tipoAsesoria: "personal" | "corporativo" | "deportivo";
  empresaId?: string;
};

export function registrarCliente(datos: DatosRegistro) {
  return post<{ usuario: { id: string; email: string; nombre: string } }>("/api/auth/registro", datos);
}

export function obtenerPerfil() {
  return pedir<{
    perfil: {
      nombre: string;
      email: string;
      cliente: { telefono: string | null; linea: string; empresa: { id: string; nombre: string } | null };
    };
  }>("/api/cliente/perfil").then((r) => r.perfil);
}

export function actualizarPerfil(datos: { nombre?: string; telefono?: string; correo?: string }) {
  return patch<{ ok: true }>("/api/cliente/perfil", datos);
}

// --- Evaluación / programa / consentimiento / pago --------------------------

export function enviarEvaluacion(datos: {
  objetivoPrincipal: string;
  principalDificultad: string;
  tiempoDeseado: string;
}) {
  return post("/api/cliente/evaluacion", datos);
}

export function aceptarConsentimiento() {
  return post("/api/cliente/consentimiento");
}

export function registrarPago(
  metodo: "Tarjeta" | "Transferencia" | "Efectivo",
  comprobanteUrl?: string,
) {
  return post("/api/cliente/pago", { metodo, comprobanteUrl });
}

// --- Citas -------------------------------------------------------------------

export type CitaCliente = {
  id: string;
  fecha: string;
  modalidad: string;
  estado: string;
  notas: string | null;
  enlaceReunion?: string | null;
};

export function listarCitas() {
  return pedir<{ citas: CitaCliente[] }>("/api/cliente/citas").then((r) => r.citas);
}

export function crearCita(fecha: string, modalidad: "Virtual" | "Presencial") {
  return post<{ cita: CitaCliente }>("/api/cliente/citas", { fecha, modalidad }).then((r) => r.cita);
}

export function cancelarCita(id: string) {
  return pedir(`/api/cliente/citas/${id}`, { method: "DELETE" });
}

// --- Mensajes ----------------------------------------------------------------

export type MensajeCliente = {
  id: string;
  texto: string;
  createdAt: string;
  de: { id: string; rol: string; nombre?: string };
};

export function listarMensajes(desde?: string) {
  const url = desde ? `/api/cliente/mensajes?desde=${encodeURIComponent(desde)}` : "/api/cliente/mensajes";
  return pedir<{ mensajes: MensajeCliente[] }>(url).then((r) => r.mensajes);
}

export function enviarMensaje(texto: string) {
  return post<{ mensaje: MensajeCliente }>("/api/cliente/mensajes", { texto }).then((r) => r.mensaje);
}

// --- Tareas ------------------------------------------------------------------

export function alternarTarea(id: string) {
  return patch<{ tarea: EstadoTarea }>(`/api/cliente/tareas/${id}`).then((r) => r.tarea);
}

// --- Empresas / diagnóstico ----------------------------------------------------

export function obtenerEmpresas() {
  return pedir<{ empresas: { id: string; nombre: string }[] }>("/api/empresas").then((r) => r.empresas);
}

export function enviarDiagnostico(datos: {
  climaLaboral: string;
  principalDesafio: string;
  nivelComunicacion: "Buena" | "Regular" | "Deficiente";
  objetivoEmpresa: string;
}) {
  return post("/api/cliente/diagnostico", datos);
}

// --- Diagnóstico deportivo (Fase 5 Entrega 2) --------------------------------

export type DiagnosticoDeportivoDatos = {
  disciplina: string;
  categoria: string;
  metaCompetitiva: string;
  bloqueoMental: string;
  nivelDescansoNutricion: string;
  horasEntrenamientoSemana: number;
};

export function enviarDiagnosticoDeportivo(datos: DiagnosticoDeportivoDatos) {
  return post("/api/cliente/diagnostico-deportivo", datos);
}

export function obtenerDiagnosticoDeportivo() {
  return pedir<{ diagnostico: DiagnosticoDeportivoDatos | null }>("/api/cliente/diagnostico-deportivo").then(
    (r) => r.diagnostico,
  );
}

