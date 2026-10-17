"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Activity, Moon, Dumbbell, Brain, Target } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import PageTransition from "@/components/PageTransition";
import TextAreaField from "@/components/TextAreaField";
import SelectField from "@/components/SelectField";
import { enviarDiagnosticoDeportivo, ApiFetchError, type DiagnosticoDeportivoDatos } from "@/lib/cliente-api";
import { erpAlert, successToast } from "@/lib/alerts";

const NIVELES_DESCANSO = [
  { value: "Excelente", label: "Excelente (8+ hrs, recuperación completa)" },
  { value: "Adecuado", label: "Adecuado (6-7 hrs, recuperación media)" },
  { value: "Deficiente", label: "Deficiente (Menos de 6 hrs o fatiga crónica)" },
];

const CATEGORIAS = [
  { value: "Alto Rendimiento / Profesional", label: "Alto Rendimiento / Profesional" },
  { value: "Competitivo Federado", label: "Competitivo Federado" },
  { value: "Amateur Avanzado", label: "Amateur Avanzado" },
  { value: "Formativo / Juvenil", label: "Formativo / Juvenil" },
];

type FormState = {
  disciplina: string;
  categoria: string;
  metaCompetitiva: string;
  bloqueoMental: string;
  nivelDescansoNutricion: string;
  horasEntrenamientoSemana: number;
};

type Errors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  disciplina: "",
  categoria: "",
  metaCompetitiva: "",
  bloqueoMental: "",
  nivelDescansoNutricion: "",
  horasEntrenamientoSemana: 12,
};

export default function DiagnosticoDeportivoPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): boolean {
    const errs: Errors = {};
    if (!form.disciplina.trim()) errs.disciplina = "Indica tu deporte o disciplina";
    if (!form.categoria) errs.categoria = "Selecciona tu nivel competitivo";
    if (!form.metaCompetitiva.trim() || form.metaCompetitiva.trim().length < 10) {
      errs.metaCompetitiva = "Describe tu meta competitiva con más detalle (mínimo 10 caracteres)";
    }
    if (!form.bloqueoMental.trim() || form.bloqueoMental.trim().length < 10) {
      errs.bloqueoMental = "Describe qué obstáculo o presión mental experimentas (mínimo 10 caracteres)";
    }
    if (!form.nivelDescansoNutricion) errs.nivelDescansoNutricion = "Selecciona tu nivel de recuperación";
    if (form.horasEntrenamientoSemana < 1) errs.horasEntrenamientoSemana = "Ingresa horas válidas";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await enviarDiagnosticoDeportivo(form);
      successToast("¡Diagnóstico deportivo registrado con éxito!");
      router.push("/home");
    } catch (err) {
      if (err instanceof ApiFetchError) {
        if (err.status === 409) {
          await erpAlert.fire({
            icon: "info",
            title: "Diagnóstico ya completado",
            text: "Ya registraste tu diagnóstico deportivo previamente.",
          });
          router.push("/home");
          return;
        }
        await erpAlert.fire({ icon: "error", title: "No se pudo guardar", text: err.message });
      } else {
        await erpAlert.fire({ icon: "error", title: "Error de conexión" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-12 pt-8 safe-top">
        <BackHeader title="Diagnóstico Deportivo" subtitle="Avanza Alto Rendimiento" />

        <div className="mb-6 mt-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white shadow-md">
          <div className="flex items-center gap-2 text-blue-200">
            <Trophy className="h-5 w-5 text-yellow-300" />
            <span className="text-xs font-semibold uppercase tracking-wider">Perfil Atlético</span>
          </div>
          <h2 className="mt-2 text-lg font-bold">Evaluación de Rendimiento Mental</h2>
          <p className="mt-1 text-xs text-blue-100 leading-relaxed">
            Identificamos tus fortalezas físicas y blindamos tu mentalidad competitiva bajo presión.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="disciplina" className="block text-sm font-medium text-gray-700">
              Deporte o Disciplina principal
            </label>
            <div className="relative mt-1">
              <input
                id="disciplina"
                type="text"
                placeholder="Ej. Atletismo, Triatlón, Fútbol, Tenis..."
                value={form.disciplina}
                onChange={(e) => handleChange("disciplina", e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            {errors.disciplina && <p className="mt-1 text-xs text-red-600">{errors.disciplina}</p>}
          </div>

          <div>
            <SelectField
              id="categoria"
              label="Nivel / Categoría Competitiva"
              placeholder="Seleccionar nivel..."
              options={CATEGORIAS}
              value={form.categoria}
              onChange={(val) => handleChange("categoria", val)}
            />
            {errors.categoria && <p className="mt-1 text-xs text-red-600">{errors.categoria}</p>}
          </div>

          <div>
            <label htmlFor="horasEntrenamiento" className="block text-sm font-medium text-gray-700">
              Horas de entrenamiento semanal
            </label>
            <input
              id="horasEntrenamiento"
              type="number"
              min={1}
              max={60}
              value={form.horasEntrenamientoSemana}
              onChange={(e) => handleChange("horasEntrenamientoSemana", parseInt(e.target.value, 10) || 1)}
              className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
            />
            {errors.horasEntrenamientoSemana && (
              <p className="mt-1 text-xs text-red-600">{errors.horasEntrenamientoSemana}</p>
            )}
          </div>

          <TextAreaField
            id="metaCompetitiva"
            label="Meta u Objetivo Competitivo principal"
            placeholder="¿Cuál es tu próximo torneo, marca o desafío clave que deseas alcanzar?"
            rows={3}
            value={form.metaCompetitiva}
            onChange={(e) => handleChange("metaCompetitiva", e.target.value)}
            error={errors.metaCompetitiva}
          />

          <TextAreaField
            id="bloqueoMental"
            label="Desafío mental / Presión competitiva"
            placeholder="¿Qué pasa por tu mente en los momentos de mayor tensión o fatiga?"
            rows={3}
            value={form.bloqueoMental}
            onChange={(e) => handleChange("bloqueoMental", e.target.value)}
            error={errors.bloqueoMental}
          />

          <div>
            <SelectField
              id="nivelDescansoNutricion"
              label="Descanso y Hábitos de Recuperación"
              placeholder="Seleccionar nivel de descanso..."
              options={NIVELES_DESCANSO}
              value={form.nivelDescansoNutricion}
              onChange={(val) => handleChange("nivelDescansoNutricion", val)}
            />
            {errors.nivelDescansoNutricion && (
              <p className="mt-1 text-xs text-red-600">{errors.nivelDescansoNutricion}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 font-semibold text-white shadow-md transition-colors hover:bg-blue-800 disabled:opacity-60"
          >
            <Activity className="h-4 w-4" />
            {submitting ? "Guardando diagnóstico..." : "Enviar Diagnóstico Deportivo"}
          </button>
        </form>
      </main>
    </PageTransition>
  );
}
