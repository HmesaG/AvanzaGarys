// Constantes de presentación compartidas por varias pantallas (líneas de
// asesoría, horarios de agenda, opciones de tiempo deseado en la
// evaluación). Ya no hay datos mock acá — todo lo demás se migró a
// lib/cliente-api.ts / lib/admin-queries.ts contra la API real.

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

export function tipoAsesoriaLabel(tipo: TipoAsesoria | "" | undefined): string {
  return TIPOS_ASESORIA.find((t) => t.id === tipo)?.label ?? "Avanza";
}

