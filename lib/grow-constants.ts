// Preguntas fijas del motor GROW — transcritas de
// Especificacion_Modulo_Coaching_GROW_AvanzA.docx (sección 4). Sin IA todavía
// (ver contexto de la migración 20261011155156_add_plan_grow): la selección de
// preguntas es estática por etapa. El día que se enchufe un proveedor de IA,
// esto se reemplaza por preguntas generadas a partir del historial del
// cliente, sin tocar el resto del motor (lib/grow-queries.ts).
//
// Tipado con string literals propios (no el enum de Prisma): este archivo lo
// importan tanto el servidor (lib/grow-queries.ts) como componentes cliente
// (app/plan-grow/page.tsx), y el runtime de @prisma/client no debe llegar al
// bundle del navegador (mismo criterio que lib/admin-formato.ts con `import type`).
export type EtapaGrowValor = "GOAL" | "REALITY" | "OPTIONS" | "WILL";

export const PREGUNTAS_GROW: Record<EtapaGrowValor, string[]> = {
  GOAL: [
    "¿Qué quieres conseguir?",
    "¿Cómo sabrás que lo has conseguido?",
    "¿En qué plazo quieres lograrlo?",
  ],
  REALITY: [
    "¿Qué está ocurriendo actualmente?",
    "¿Qué has intentado hasta ahora?",
    "¿Qué está funcionando y qué no?",
  ],
  OPTIONS: [
    "¿Qué opciones tienes?",
    "¿Qué más podrías intentar?",
    "¿Qué recursos tienes disponibles?",
  ],
  WILL: [
    "¿Qué vas a hacer?",
    "¿Cuándo lo harás?",
    "¿Cómo medirás el cumplimiento?",
    "¿Qué podría impedirte hacerlo y cómo lo manejarás?",
  ],
};

export const ETAPA_LABEL: Record<EtapaGrowValor, string> = {
  GOAL: "Objetivo",
  REALITY: "Realidad",
  OPTIONS: "Opciones",
  WILL: "Acción",
};

/** Mapeo fijo semana→etapa del prototipo de 4 semanas ("Plan de Desarrollo de Liderazgo"). */
export const ETAPA_POR_SEMANA: Record<number, EtapaGrowValor> = {
  1: "GOAL",
  2: "REALITY",
  3: "OPTIONS",
  4: "WILL",
};

export const TOTAL_SEMANAS_PROTOTIPO = 4;

/** Cuántos compromisos se piden al cliente tras completar la etapa WILL. */
export const COMPROMISOS_REQUERIDOS = 2;

const ORDEN_ETAPAS: EtapaGrowValor[] = ["GOAL", "REALITY", "OPTIONS", "WILL"];

export function siguienteEtapa(etapaActual: EtapaGrowValor): EtapaGrowValor | null {
  const idx = ORDEN_ETAPAS.indexOf(etapaActual);
  return idx >= 0 && idx < ORDEN_ETAPAS.length - 1 ? ORDEN_ETAPAS[idx + 1] : null;
}
