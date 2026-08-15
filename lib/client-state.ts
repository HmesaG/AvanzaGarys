"use client";

// Estado del cliente persistido en localStorage — reemplaza el backend en Fase 1.
// Todas las lecturas están guardadas contra SSR (siempre se llaman desde efectos/handlers de cliente).

import { Programa, TipoAsesoria } from "./mock-data";

const KEY = "avanza:cliente";

export type RegistroCliente = {
  nombreCompleto: string;
  telefono: string;
  correo: string;
  edad: string;
  tipoAsesoria: TipoAsesoria | "";
};

export type EvaluacionCliente = {
  objetivoPrincipal: string;
  principalDificultad: string;
  tiempoDeseado: string;
};

export type SesionAgendada = {
  fechaLabel: string; // ej. "Jueves 23 de mayo"
  hora: string;
  modalidad: "Virtual" | "Presencial";
};

// Estado del "puente" evaluación -> agenda (pasos 5-8 del flujo real):
// revisión del coach, asignación de programa, consentimiento y pago.
export type EstadoEvaluacion = "pendiente" | "aprobada" | "rechazada";

export type Consentimiento = {
  aceptado: boolean;
  fecha: string; // ISO
};

export type MetodoPago = "Tarjeta" | "Transferencia";

export type Pago = {
  monto: number;
  metodo: MetodoPago;
  estado: "pendiente" | "pagado";
  fecha: string | null; // ISO, null hasta que se registre el pago
};

export type ClienteState = {
  registro: RegistroCliente | null;
  evaluacion: EvaluacionCliente | null;
  sesion: SesionAgendada | null;
  estadoEvaluacion: EstadoEvaluacion | null;
  programaAsignado: Programa | null;
  consentimiento: Consentimiento | null;
  pago: Pago | null;
};

const DEFAULT_STATE: ClienteState = {
  registro: null,
  evaluacion: null,
  sesion: null,
  estadoEvaluacion: null,
  programaAsignado: null,
  consentimiento: null,
  pago: null,
};

export function getClienteState(): ClienteState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function setClienteState(state: ClienteState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function saveRegistro(registro: RegistroCliente) {
  const state = getClienteState();
  setClienteState({ ...state, registro });
}

export function saveEvaluacion(evaluacion: EvaluacionCliente) {
  const state = getClienteState();
  // Enviar la evaluación deja al cliente "pendiente de aprobación" — ya no
  // puede saltar directo a agenda, tiene que pasar por revisión del coach
  // (paso 5), asignación de programa (6), consentimiento (7) y pago (8).
  setClienteState({
    ...state,
    evaluacion,
    estadoEvaluacion: "pendiente",
    programaAsignado: null,
    consentimiento: null,
    pago: null,
  });
}

/** Coach aprueba la evaluación y asigna uno de los programas mock (paso 5-6). */
export function aprobarEvaluacion(programa: Programa) {
  const state = getClienteState();
  setClienteState({
    ...state,
    estadoEvaluacion: "aprobada",
    programaAsignado: programa,
    pago: {
      monto: programa.precio,
      metodo: "Tarjeta",
      estado: "pendiente",
      fecha: null,
    },
  });
}

/** Coach rechaza la evaluación — el cliente deberá volver a completarla. */
export function rechazarEvaluacion() {
  const state = getClienteState();
  setClienteState({ ...state, estadoEvaluacion: "rechazada", programaAsignado: null });
}

/** Cliente acepta consentimiento/contrato (paso 7). */
export function saveConsentimiento() {
  const state = getClienteState();
  const consentimiento: Consentimiento = {
    aceptado: true,
    fecha: new Date().toISOString(),
  };
  setClienteState({ ...state, consentimiento });
}

/** Cliente registra el pago (paso 8) — mock, sin pasarela real. */
export function savePago(metodo: MetodoPago) {
  const state = getClienteState();
  if (!state.pago) return;
  const pago: Pago = {
    ...state.pago,
    metodo,
    estado: "pagado",
    fecha: new Date().toISOString(),
  };
  setClienteState({ ...state, pago });
}

/** true solo cuando el cliente completó consentimiento y pago — habilita /agenda. */
export function puedeAgendar(state: ClienteState): boolean {
  return Boolean(state.consentimiento?.aceptado && state.pago?.estado === "pagado");
}

export function saveSesion(sesion: SesionAgendada) {
  const state = getClienteState();
  setClienteState({ ...state, sesion });
}

export function clearSesion() {
  const state = getClienteState();
  setClienteState({ ...state, sesion: null });
}

// Cerrar sesión (mock) — limpia el estado local del cliente. Sin backend real que invalidar.
export function clearClienteState() {
  setClienteState(DEFAULT_STATE);
}

export function tipoAsesoriaLabel(tipo: TipoAsesoria | "" | undefined): string {
  switch (tipo) {
    case "personal":
      return "Avanza Personal";
    case "corporativo":
      return "Avanza Corporativo";
    case "deportivo":
      return "Avanza Deportivo";
    default:
      return "Avanza";
  }
}
