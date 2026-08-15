"use client";

// Estado del cliente persistido en localStorage — reemplaza el backend en Fase 1.
// Todas las lecturas están guardadas contra SSR (siempre se llaman desde efectos/handlers de cliente).

import { TipoAsesoria } from "./mock-data";

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

export type ClienteState = {
  registro: RegistroCliente | null;
  evaluacion: EvaluacionCliente | null;
  sesion: SesionAgendada | null;
};

const DEFAULT_STATE: ClienteState = {
  registro: null,
  evaluacion: null,
  sesion: null,
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
  setClienteState({ ...state, evaluacion });
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
