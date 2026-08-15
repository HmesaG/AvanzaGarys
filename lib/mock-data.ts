// Datos mock — Fase 1 (sin backend). Toda la persistencia real llega en fases posteriores.

export type TipoAsesoria = "personal" | "corporativo" | "deportivo";

export const TIPOS_ASESORIA: {
  id: TipoAsesoria;
  label: string;
  icon: "user" | "briefcase" | "activity";
  colorClass: string;
  bgClass: string;
  ringClass: string;
}[] = [
  {
    id: "personal",
    label: "Avanza Personal",
    icon: "user",
    colorClass: "bg-avanza-green hover:bg-avanza-green-dark",
    bgClass: "bg-avanza-green-light",
    ringClass: "focus-visible:ring-avanza-green",
  },
  {
    id: "corporativo",
    label: "Avanza Corporativo",
    icon: "briefcase",
    colorClass: "bg-avanza-blue hover:bg-blue-800",
    bgClass: "bg-avanza-blue-light",
    ringClass: "focus-visible:ring-avanza-blue",
  },
  {
    id: "deportivo",
    label: "Avanza Deportivo",
    icon: "activity",
    colorClass: "bg-avanza-orange hover:bg-orange-800",
    bgClass: "bg-avanza-orange-light",
    ringClass: "focus-visible:ring-avanza-orange",
  },
];

export const OPCIONES_TIEMPO = [
  { value: "1_mes", label: "En 1 mes" },
  { value: "3_meses", label: "En 3 meses" },
  { value: "6_meses", label: "En 6 meses" },
  { value: "1_anio", label: "En 1 año" },
  { value: "sin_definir", label: "Aún no lo tengo claro" },
];

export const HORARIOS_DISPONIBLES = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "04:00 PM",
  "05:00 PM",
];

export type Mensaje = {
  id: string;
  de: "cliente" | "asesor";
  texto: string;
  hora: string;
};

export const ASESOR_MOCK = {
  nombre: "Carlos Reyes",
  rol: "Asesor",
  enLinea: true,
  avatarIniciales: "CR",
};

export const MENSAJES_INICIALES: Mensaje[] = [
  {
    id: "m1",
    de: "asesor",
    texto: "¡Hola! ¿Cómo vas con las tareas asignadas?",
    hora: "10:30 AM",
  },
  {
    id: "m2",
    de: "cliente",
    texto: "Hola, muy bien. He estado practicando cada día.",
    hora: "10:32 AM",
  },
  {
    id: "m3",
    de: "asesor",
    texto: "Excelente, sigue así. Recuerda que la constancia es la clave.",
    hora: "10:33 AM",
  },
  {
    id: "m4",
    de: "cliente",
    texto: "¡Gracias!",
    hora: "10:34 AM",
  },
];

export type Tarea = {
  id: string;
  label: string;
  completada: boolean;
};

export const TAREAS_INICIALES: Tarea[] = [
  { id: "t1", label: "Ejercicio de autoconocimiento", completada: false },
  { id: "t2", label: "Diario emocional", completada: true },
  { id: "t3", label: "Técnicas de respiración", completada: false },
];

export const OBJETIVO_PRINCIPAL_MOCK = "Mejorar mi autoestima y manejo de estrés";
export const PROGRESO_MOCK = 60;

// Programas mock por línea de asesoría — el coach elige uno al aprobar la
// evaluación de un cliente (paso 6 del flujo real: asignación del programa).
export type Programa = {
  id: string;
  nombre: string;
  descripcion: string;
  sesionesIncluidas: number;
  tipoAsesoria: TipoAsesoria;
  precio: number;
};

export const PROGRAMAS_MOCK: Record<TipoAsesoria, Programa[]> = {
  personal: [
    {
      id: "personal-basico",
      nombre: "Impulso Personal",
      descripcion: "Acompañamiento individual enfocado en un objetivo concreto a corto plazo.",
      sesionesIncluidas: 4,
      tipoAsesoria: "personal",
      precio: 6000,
    },
    {
      id: "personal-integral",
      nombre: "Transformación Integral",
      descripcion: "Proceso completo de coaching personal con seguimiento semanal.",
      sesionesIncluidas: 8,
      tipoAsesoria: "personal",
      precio: 11000,
    },
  ],
  corporativo: [
    {
      id: "corporativo-equipo",
      nombre: "Liderazgo de Equipo",
      descripcion: "Desarrollo de habilidades de liderazgo y gestión de equipos.",
      sesionesIncluidas: 6,
      tipoAsesoria: "corporativo",
      precio: 15000,
    },
    {
      id: "corporativo-ejecutivo",
      nombre: "Coaching Ejecutivo",
      descripcion: "Acompañamiento estratégico para posiciones de alta responsabilidad.",
      sesionesIncluidas: 10,
      tipoAsesoria: "corporativo",
      precio: 24000,
    },
  ],
  deportivo: [
    {
      id: "deportivo-rendimiento",
      nombre: "Alto Rendimiento",
      descripcion: "Preparación mental para competencia y mejora del enfoque deportivo.",
      sesionesIncluidas: 6,
      tipoAsesoria: "deportivo",
      precio: 9000,
    },
    {
      id: "deportivo-constancia",
      nombre: "Constancia y Hábito",
      descripcion: "Construcción de rutinas sostenibles y manejo de la motivación.",
      sesionesIncluidas: 4,
      tipoAsesoria: "deportivo",
      precio: 5500,
    },
  ],
};
