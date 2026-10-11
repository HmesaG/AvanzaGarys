"use client";

// Wrapper fetch tipado para /plan-grow — mismo rol que lib/cliente-api.ts.
import { ApiFetchError } from "./cliente-api";

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new ApiFetchError(respuesta.status, cuerpo?.error ?? "Ocurrió un error inesperado", cuerpo?.codigo ?? "error");
  }
  return cuerpo as T;
}

function post<T>(url: string, data?: unknown) {
  return pedir<T>(url, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined });
}
function patch<T>(url: string, data?: unknown) {
  return pedir<T>(url, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined });
}

export type EtapaGrowValor = "GOAL" | "REALITY" | "OPTIONS" | "WILL";
export type EstadoCompromisoValor = "PENDIENTE" | "CUMPLIDO" | "NO_CUMPLIDO";

export type CompromisoGrow = {
  id: string;
  accion: string;
  fechaPrevista: string;
  estado: EstadoCompromisoValor;
  resultado: string | null;
};

export type SesionGrow = {
  id: string;
  semana: number;
  etapa: EtapaGrowValor;
  respuestas: { pregunta: string; respuesta: string }[] | null;
  notaCoach: string | null;
  completadaAt: string | null;
  compromisos: CompromisoGrow[];
};

export type PlanGrow = {
  id: string;
  tipo: string;
  semanaActual: number;
  totalSemanas: number;
  estado: "ACTIVO" | "EN_SEGUIMIENTO" | "PAUSADO" | "CERRADO";
  sesiones: SesionGrow[];
};

export function obtenerPlanGrow() {
  return pedir<{ plan: PlanGrow | null }>("/api/cliente/plan-grow").then((r) => r.plan);
}

export function iniciarPlanGrow() {
  return post<{ plan: PlanGrow }>("/api/cliente/plan-grow").then((r) => r.plan);
}

export function responderSesionGrow(sesionId: string, respuestas: { pregunta: string; respuesta: string }[]) {
  return post<{ plan: PlanGrow }>(`/api/cliente/plan-grow/sesiones/${sesionId}`, { respuestas }).then(
    (r) => r.plan,
  );
}

export function crearCompromisosGrow(compromisos: { accion: string; fechaPrevista: string }[]) {
  return post<{ plan: PlanGrow }>("/api/cliente/plan-grow/compromisos", { compromisos }).then((r) => r.plan);
}

export function reportarCompromisoGrow(id: string, estado: "CUMPLIDO" | "NO_CUMPLIDO", resultado?: string) {
  return patch<{ plan: PlanGrow }>(`/api/cliente/plan-grow/compromisos/${id}`, { estado, resultado }).then(
    (r) => r.plan,
  );
}
