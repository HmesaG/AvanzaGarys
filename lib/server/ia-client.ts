// Cliente unificado de Inteligencia Artificial para el motor GROW de Avanza.
// Soporta Gemini API, OpenAI y Anthropic mediante variables de entorno, con un
// motor determinístico de contingencia (fallback) de alto nivel en caso de fallo
// de red, cuota agotada o ausencia de credenciales.

export type EtapaGrow = "GOAL" | "REALITY" | "OPTIONS" | "WILL";

export type FeedbackIaGrow = {
  reflexion: string;
  fortalezas: string[];
  desafiosDetectados: string[];
  preguntasReflexivas: string[];
  sugerenciasCompromisos?: string[];
  proveedorUtilizado: "gemini" | "openai" | "anthropic" | "motor_deterministico";
};

export type SolicitudIaGrow = {
  etapa: EtapaGrow;
  semana: number;
  tipoPlan: string;
  respuestas: { pregunta: string; respuesta: string }[];
  historialPrevio?: { etapa: EtapaGrow; respuestas: { pregunta: string; respuesta: string }[] }[];
};

/**
 * Genera feedback reflexivo estructurado según la etapa GROW y las respuestas del cliente.
 */
export async function generarFeedbackGrow(solicitud: SolicitudIaGrow): Promise<FeedbackIaGrow> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey) {
    try {
      const res = await llamarGemini(solicitud, geminiKey);
      if (res) return { ...res, proveedorUtilizado: "gemini" };
    } catch (e) {
      console.warn("Fallo en proveedor Gemini, activando fallback:", (e as Error).message);
    }
  }

  if (openaiKey) {
    try {
      const res = await llamarOpenAI(solicitud, openaiKey);
      if (res) return { ...res, proveedorUtilizado: "openai" };
    } catch (e) {
      console.warn("Fallo en proveedor OpenAI, activando fallback:", (e as Error).message);
    }
  }

  if (anthropicKey) {
    try {
      const res = await llamarAnthropic(solicitud, anthropicKey);
      if (res) return { ...res, proveedorUtilizado: "anthropic" };
    } catch (e) {
      console.warn("Fallo en proveedor Anthropic, activando fallback:", (e as Error).message);
    }
  }

  // Motor determinístico de contingencia
  return generarFeedbackDeterministico(solicitud);
}

/**
 * Sugiere 2 compromisos SMART de acción para la etapa WILL
 */
export async function sugerirCompromisosGrow(params: {
  tipoPlan: string;
  respuestasWill: { pregunta: string; respuesta: string }[];
  respuestasGoal?: { pregunta: string; respuesta: string }[];
}): Promise<{ accion: string; diasSugeridos: number; rationale: string }[]> {
  const goalTxt = params.respuestasGoal?.map((r) => r.respuesta).join(" ") || "Desarrollo personal y profesional";
  const willTxt = params.respuestasWill.map((r) => r.respuesta).join(" ");

  return [
    {
      accion: `Implementar una sesión semanal de revisión y foco de 30 minutos vinculada a: ${goalTxt.slice(0, 60)}...`,
      diasSugeridos: 7,
      rationale: "Establece un hábito recurrente de rendición de cuentas personal.",
    },
    {
      accion: `Ejecutar la primera acción directa identificada: "${willTxt.slice(0, 70)}..." y documentar el aprendizaje`,
      diasSugeridos: 14,
      rationale: "Convierte la intención en un hito verificable con fecha límite.",
    },
  ];
}

// --- Integraciones directas HTTP (cero dependencias pesadas extras) ---

async function llamarGemini(solicitud: SolicitudIaGrow, apiKey: string): Promise<Omit<FeedbackIaGrow, "proveedorUtilizado"> | null> {
  const prompt = construirPromptGrow(solicitud);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!resp.ok) throw new Error(`Gemini status ${resp.status}`);
  const data = await resp.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;
  return JSON.parse(rawText);
}

async function llamarOpenAI(solicitud: SolicitudIaGrow, apiKey: string): Promise<Omit<FeedbackIaGrow, "proveedorUtilizado"> | null> {
  const prompt = construirPromptGrow(solicitud);
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Eres un Master Coach ontológico experto en la metodología GROW. Devuelve siempre JSON válido." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!resp.ok) throw new Error(`OpenAI status ${resp.status}`);
  const data = await resp.json();
  const rawText = data?.choices?.[0]?.message?.content;
  if (!rawText) return null;
  return JSON.parse(rawText);
}

async function llamarAnthropic(solicitud: SolicitudIaGrow, apiKey: string): Promise<Omit<FeedbackIaGrow, "proveedorUtilizado"> | null> {
  const prompt = construirPromptGrow(solicitud);
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1000,
      system: "Eres un Master Coach ontológico experto en la metodología GROW. Devuelve únicamente un objeto JSON estructurado.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) throw new Error(`Anthropic status ${resp.status}`);
  const data = await resp.json();
  const rawText = data?.content?.[0]?.text;
  if (!rawText) return null;
  return JSON.parse(rawText);
}

function construirPromptGrow(s: SolicitudIaGrow): string {
  return `
Analiza la siguiente sesión de coaching en el modelo GROW:
- Plan: ${s.tipoPlan}
- Etapa Actual: ${s.etapa} (Semana ${s.semana})
- Respuestas del coachee:
${s.respuestas.map((r, i) => `${i + 1}. Pregunta: "${r.pregunta}" -> Respuesta: "${r.respuesta}"`).join("\n")}

Genera una respuesta en formato JSON con la siguiente estructura exacta:
{
  "reflexion": "Un análisis empático, motivador y perspicaz (máximo 3 párrafos cortos) validando la honestidad y claridad del coachee.",
  "fortalezas": ["Fortaleza 1 detectada en su respuesta", "Fortaleza 2"],
  "desafiosDetectados": ["Punto ciego o desafío a tener en cuenta"],
  "preguntasReflexivas": ["Una pregunta socrática poderosa para profundizar en su próxima sesión"],
  "sugerenciasCompromisos": ${s.etapa === "WILL" ? '["Compromiso sugerido 1", "Compromiso sugerido 2"]' : "[]"}
}
`;
}

// --- Motor determinístico de contingencia ---

function generarFeedbackDeterministico(s: SolicitudIaGrow): FeedbackIaGrow {
  const respuestasTexto = s.respuestas.map((r) => r.respuesta.toLowerCase()).join(" ");
  const tieneCompromiso = respuestasTexto.includes("quiero") || respuestasTexto.includes("voy") || respuestasTexto.includes("hacer");

  let reflexion = "";
  let fortalezas: string[] = [];
  let desafiosDetectados: string[] = [];
  let preguntasReflexivas: string[] = [];

  switch (s.etapa) {
    case "GOAL":
      reflexion = `Excelente claridad al definir tus metas en el plan ${s.tipoPlan}. Tus respuestas reflejan una dirección clara y un compromiso genuino con tu progreso.`;
      fortalezas = ["Claridad de propósito", "Conciencia del horizonte temporal deseado"];
      desafiosDetectados = ["Mantener métricas concretas y medibles a medida que avancen las semanas."];
      preguntasReflexivas = [
        "¿De qué manera alcanzar este objetivo transformará tu día a día?",
        "¿Quiénes se verán positivamente impactados con este logro?",
      ];
      break;

    case "REALITY":
      reflexion = `Has demostrado valentía y autocrítica constructiva al evaluar tu punto de partida actual. Reconocer lo que funciona y lo que no es el paso fundamental para el cambio.`;
      fortalezas = ["Honestidad en el diagnóstico", "Capacidad de identificar obstáculos reales"];
      desafiosDetectados = ["Evitar caer en la resignación ante factores externos que escapan a tu control directo."];
      preguntasReflexivas = [
        "¿Qué depende exclusivamente de ti en esta situación actual?",
        "¿Qué recurso interno te ha servido en el pasado para superar una situación similar?",
      ];
      break;

    case "OPTIONS":
      reflexion = `Has explorado alternativas con amplitud de criterio. La etapa de opciones te permite abrir el abanico antes de comprometerte con un curso de acción.`;
      fortalezas = ["Creatividad en la búsqueda de soluciones", "Disposición a probar nuevos enfoques"];
      desafiosDetectados = ["Priorizar las opciones de mayor impacto en vez de intentar abordarlo todo a la vez."];
      preguntasReflexivas = [
        "Si tuvieras la certeza de no fallar, ¿cuál de estas opciones elegirías primero?",
        "¿Qué consejo le darías a un amigo que estuviera en tu misma situación?",
      ];
      break;

    case "WILL":
      reflexion = `Has alcanzado la fase culminante de acción y voluntad. Pasar de la reflexión a la ejecución tangible es lo que distingue un deseo de un resultado real.`;
      fortalezas = [
        tieneCompromiso ? "Determinación y enfoque pragmático" : "Sentido de responsabilidad",
        "Conciencia de los posibles obstáculos",
      ];
      desafiosDetectados = ["Blindar tus compromisos contra la postergación o las urgencias imprevistas."];
      preguntasReflexivas = [
        "¿Cómo vas a celebrar el cumplimiento de tu primer compromiso?",
        "¿Cuál es el primer paso específico que darás en las próximas 24 horas?",
      ];
      break;
  }

  return {
    reflexion,
    fortalezas,
    desafiosDetectados,
    preguntasReflexivas,
    sugerenciasCompromisos:
      s.etapa === "WILL"
        ? [
            "Reservar un bloque innegociable de 45 minutos esta semana para tu acción principal.",
            "Establecer un indicador semanal de seguimiento y compartirlo con tu coach.",
          ]
        : [],
    proveedorUtilizado: "motor_deterministico",
  };
}
