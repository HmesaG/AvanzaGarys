// Preguntas y Catálogo del Motor GROW — Avanza.
// Tipado con string literals propios (no el enum de Prisma): este archivo lo
// importan tanto el servidor (lib/grow-queries.ts) como componentes cliente
// (app/plan-grow/page.tsx), y el runtime de @prisma/client no debe llegar al
// bundle del navegador.

export type EtapaGrowValor = "GOAL" | "REALITY" | "OPTIONS" | "WILL";
export type TipoPlanGrow = "LIDERAZGO" | "PRODUCTIVIDAD" | "INTELIGENCIA_EMOCIONAL" | "COMUNICACION";

export interface PlanCatalogoInfo {
  tipo: TipoPlanGrow;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  duracionSemanas: number;
  etiquetas: string[];
  preguntasPorEtapa: Record<EtapaGrowValor, string[]>;
}

export const CATALOGO_PLANES_GROW: Record<TipoPlanGrow, PlanCatalogoInfo> = {
  LIDERAZGO: {
    tipo: "LIDERAZGO",
    titulo: "Plan de Desarrollo de Liderazgo",
    subtitulo: "Visión de equipo, delegación e influencia positiva",
    descripcion: "Diseñado para líderes, gerentes y coordinadores que buscan inspirar a sus equipos, comunicarse con autoridad y alcanzar metas colectivas.",
    duracionSemanas: 4,
    etiquetas: ["Liderazgo", "Equipos", "Impacto"],
    preguntasPorEtapa: {
      GOAL: [
        "¿Qué resultado específico deseas alcanzar como líder?",
        "¿Cómo sabrás que tu equipo ha alcanzado ese nivel de desempeño?",
        "¿En qué plazo temporal te propones consolidar este hito?",
      ],
      REALITY: [
        "¿Cuál es la dinámica actual de tu equipo y qué dificultades observas?",
        "¿Qué conversaciones difíciles o delegaciones has postergado?",
        "¿Qué fortalezas tiene hoy el equipo que no se están aprovechando al máximo?",
      ],
      OPTIONS: [
        "¿Qué estrategias de liderazgo alternativas podrías ensayar?",
        "¿Cómo podrías delegar responsabilidades clave de forma más efectiva?",
        "¿Qué mentores, aliados o recursos tienes a tu disposición?",
      ],
      WILL: [
        "¿Qué decisión de liderazgo vas a tomar en los próximos días?",
        "¿Cuándo y cómo la comunicarás a tu equipo?",
        "¿Cómo medirás el impacto y el compromiso de cada integrante?",
        "¿Qué obstáculo interno o externo podría frenarte y cómo responderás?",
      ],
    },
  },
  PRODUCTIVIDAD: {
    tipo: "PRODUCTIVIDAD",
    titulo: "Alto Rendimiento y Productividad",
    subtitulo: "Enfoque profundo, eliminación de distracciones y hábitos de poder",
    descripcion: "Ideal para profesionales con sobrecarga de tareas que buscan recuperar el control de su agenda, priorizar con maestría y lograr más con menos estrés.",
    duracionSemanas: 4,
    etiquetas: ["Productividad", "Foco", "Gestión del Tiempo"],
    preguntasPorEtapa: {
      GOAL: [
        "¿Qué objetivo de alta prioridad transformará tu rendimiento si lo completas?",
        "¿Cómo se verá tu semana ideal en términos de foco y tiempo libre?",
        "¿En cuántas semanas quieres tener instalado tu nuevo sistema de trabajo?",
      ],
      REALITY: [
        "¿Cuáles son tus mayores ladrones de tiempo y fuentes de dispersión?",
        "¿Qué porcentaje de tu día dedicas a lo urgente vs. a lo verdaderamente importante?",
        "¿En qué momentos del día experimentas tus mayores caídas de energía?",
      ],
      OPTIONS: [
        "¿Qué tareas podrías eliminar, automatizar o delegar de inmediato?",
        "¿Qué bloques de foco ininterrumpido podrías blindar en tu calendario?",
        "¿Qué herramientas o metodologías (Timeboxing, Pomodoro, etc.) te gustaría probar?",
      ],
      WILL: [
        "¿Qué compromiso concreto vas a asumir con tu agenda esta semana?",
        "¿Qué distracción específica eliminarás a partir de hoy?",
        "¿Cómo registrarás tu avance diario sin fallar?",
        "¿Qué harás cuando surja un imprevisto que amenace tu bloque de foco?",
      ],
    },
  },
  INTELIGENCIA_EMOCIONAL: {
    tipo: "INTELIGENCIA_EMOCIONAL",
    titulo: "Inteligencia Emocional y Resiliencia",
    subtitulo: "Autoconocimiento, gestión del estrés y claridad bajo presión",
    descripcion: "Para quienes buscan fortalecer su templanza, responder en lugar de reaccionar ante los desafíos y cultivar bienestar psicológico sostenible.",
    duracionSemanas: 4,
    etiquetas: ["Emociones", "Resiliencia", "Bienestar"],
    preguntasPorEtapa: {
      GOAL: [
        "¿Qué estado emocional y mental deseas consolidar en tu día a día?",
        "¿En qué situaciones específicas necesitas mayor calma y equilibrio?",
        "¿Cómo impactará esta mayor serenidad en tus relaciones personales y laborales?",
      ],
      REALITY: [
        "¿Cuáles son tus detonantes de estrés, frustración o reactividad habituales?",
        "¿Cómo reacciona tu cuerpo cuando sientes una emoción intensa?",
        "¿Qué hábitos de descanso, desconexión y autocuidado tienes actualmente?",
      ],
      OPTIONS: [
        "¿Qué técnicas de pausa consciente o respiración puedes incorporar ante la presión?",
        "¿Qué nuevas perspectivas te ayudarían a interpretar los momentos de fricción?",
        "¿Qué límites saludables necesitas establecer con otros o contigo mismo?",
      ],
      WILL: [
        "¿Qué práctica diaria de bienestar vas a iniciar formalmente?",
        "¿Qué harás la próxima vez que notes que estás perdiendo la calma?",
        "¿Con qué frecuencia harás un chequeo de tu estado emocional?",
        "¿Qué recordatorio visible colocarás para mantener presente este compromiso?",
      ],
    },
  },
  COMUNICACION: {
    tipo: "COMUNICACION",
    titulo: "Comunicación Asertiva y Negociación",
    subtitulo: "Claridad, empatía, escucha activa e impacto interpersonal",
    descripcion: "Diseñado para personas que necesitan expresar sus ideas con firmeza respetuosa, resolver conflictos constructivamente y negociar con éxito.",
    duracionSemanas: 4,
    etiquetas: ["Comunicación", "Asertividad", "Negociación"],
    preguntasPorEtapa: {
      GOAL: [
        "¿Qué mensaje, conversación o negociación clave necesitas abordar con éxito?",
        "¿Cuál sería el resultado ideal para ambas partes tras esa interacción?",
        "¿Cómo quieres ser percibido en términos de claridad y respeto?",
      ],
      REALITY: [
        "¿Tiendes a callar por evitar el conflicto o a imponerte con vehemencia?",
        "¿Qué suposiciones o miedos te impiden decir exactamente lo que piensas?",
        "¿Qué patrones repetitivos de malentendido notas en tus conversaciones clave?",
      ],
      OPTIONS: [
        "¿Cómo podrías estructurar tu mensaje usando hechos observables sin juicios?",
        "¿Qué preguntas abiertas podrías hacer para validar la postura de la otra persona?",
        "¿Qué concesiones o propuestas 'ganar-ganar' podrías poner sobre la mesa?",
      ],
      WILL: [
        "¿Con quién y cuándo agendarás la conversación que has venido postergando?",
        "¿Qué frase de apertura asertiva utilizarás para abrir el diálogo?",
        "¿Cómo vas a escuchar sin interrumpir ni ponerte a la defensiva?",
        "¿Qué acuerdo por escrito o seguimiento formal dejarás asentado?",
      ],
    },
  },
};

// Preguntas base de compatibilidad por etapa
export const PREGUNTAS_GROW: Record<EtapaGrowValor, string[]> = CATALOGO_PLANES_GROW.LIDERAZGO.preguntasPorEtapa;

export function obtenerPreguntasPlan(tipoPlan: string, etapa: EtapaGrowValor): string[] {
  const planInfo = CATALOGO_PLANES_GROW[tipoPlan as TipoPlanGrow];
  if (planInfo && planInfo.preguntasPorEtapa[etapa]) {
    return planInfo.preguntasPorEtapa[etapa];
  }
  return PREGUNTAS_GROW[etapa];
}

export const ETAPA_LABEL: Record<EtapaGrowValor, string> = {
  GOAL: "Objetivo",
  REALITY: "Realidad",
  OPTIONS: "Opciones",
  WILL: "Acción",
};

/** Mapeo fijo semana→etapa de los planes de 4 semanas. */
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
